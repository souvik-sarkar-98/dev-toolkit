import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { EventBus } from '@nestjs/cqrs';
import { Request, Response } from 'express';
import { AppTechnicalError, TechnicalErrorPayload } from '../../application/events/app-technical-error.event';
import { isLocalEnv } from '../../infrastructure/utilities/env.util';
import { BusinessError } from '../../domain/errors/business-error';
import { ErrorResponse } from '../models/response-model';
import { getTraceId, resolveTraceId } from '../../infrastructure/utilities/trace-context.util';
import { resolvePublicErrorMessage } from '../errors/public-error-message.resolver';

interface ClassifiedError {
  status: number;
  messages: string[];
  errorCode?: string;
  stackTrace?: string;
}

// Duck-type Prisma error detection — avoids a hard dependency on the
// consumer's generated Prisma client package in this shared library.
function isPrismaKnownRequestError(
  error: unknown,
): error is { name: string; code: string; message: string; stack?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

function isPrismaValidationError(
  error: unknown,
): error is { name: string; message: string; stack?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'PrismaClientValidationError'
  );
}

/**
 * Global exception filter that handles all exceptions in the application.
 *
 * Behavior:
 * - Business exceptions: Returns a stable, client-safe public message
 * - HTTP exceptions (4xx): Returns the error message
 * - Server errors (5xx): Returns generic message in production, detailed error in non-production
 * - Unknown errors: Returns generic message in production, detailed error in non-production
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly maskErrors: boolean;

  constructor(
    @Optional() private readonly eventBus?: EventBus,
    private readonly environment?: string,
  ) {
    this.maskErrors = !isLocalEnv(environment);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const classified = this.classifyException(exception);
    const errorResponse = this.buildErrorResponse(request, classified);

    this.emitTechnicalError(classified.status, errorResponse);
    this.logRequestContext(request, classified);
    this.sanitiseForClient(exception, classified.status, errorResponse);

    response.status(classified.status).json(errorResponse);
  }

  /**
   * Determines HTTP status, messages, and error code from the thrown value.
   * Also performs exception-type-level logging (before request context is available).
   */
  private classifyException(exception: unknown): ClassifiedError {
    const stackTrace = this.readStackTrace(exception);

    if (exception instanceof BusinessError) {
      this.logger.warn(`Business Error: ${exception.message}`, stackTrace);
      return {
        status: exception.statusCode,
        messages: [resolvePublicErrorMessage(exception)],
        errorCode: exception.errorCode,
        stackTrace,
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        messages: ['Too many requests. Please try again later.'],
        errorCode: 'RATE_LIMITED',
        stackTrace,
      };
    }

    if (exception instanceof HttpException) {
      return { ...this.classifyHttpException(exception), stackTrace };
    }

    if (isPrismaKnownRequestError(exception)) {
      switch (exception.code) {
        case 'P2002':
          this.logger.warn(`Prisma P2002 unique constraint violation`, stackTrace);
          return { status: HttpStatus.CONFLICT, messages: ['Resource already exists'], stackTrace };
        case 'P2025':
          this.logger.warn(`Prisma P2025 record not found`, stackTrace);
          return { status: HttpStatus.NOT_FOUND, messages: ['Resource not found'], stackTrace };
        case 'P2003':
          this.logger.warn(`Prisma P2003 foreign key constraint violation`, stackTrace);
          return { status: HttpStatus.BAD_REQUEST, messages: ['Invalid reference'], stackTrace };
        default:
          this.logger.error(
            `Prisma ${exception.code} error: ${exception.message}`,
            stackTrace,
          );
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            messages: ['A database error occurred'],
            stackTrace,
          };
      }
    }

    if (isPrismaValidationError(exception)) {
      const err = exception as { message: string; stack?: string };
      this.logger.warn(`Prisma validation error: ${err.message}`, stackTrace);
      return { status: HttpStatus.BAD_REQUEST, messages: ['Invalid input data'], stackTrace };
    }

    const error = exception as Error;
    this.logger.error(
      `Unhandled Exception: ${error?.message || 'Unknown error'} (${error?.name ?? 'Error'})`,
      stackTrace,
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messages: [error?.message || 'An unexpected error occurred'],
      stackTrace,
    };
  }

  /** Extracts status + messages from an `HttpException` and logs if needed. */
  private classifyHttpException(exception: HttpException): Omit<ClassifiedError, 'stackTrace'> {
    const status = exception.getStatus();
    const raw = exception.getResponse();
    let messages: string[];
    let errorCode: string | undefined;

    if (typeof raw === 'string') {
      messages = [raw];
    } else if (typeof raw === 'object' && raw !== null) {
      const obj = raw as { message?: string | string[]; errorCode?: string };
      messages = obj.message
        ? Array.isArray(obj.message) ? obj.message : [obj.message]
        : ['An error occurred'];
      errorCode = obj.errorCode;
    } else {
      messages = ['An error occurred'];
    }

    const stackTrace = exception.stack;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`HTTP ${status} Error: ${messages.join(', ')}`, stackTrace);
    } else if (status === HttpStatus.BAD_REQUEST) {
      this.logger.warn(`HTTP ${status} Error: ${messages.join(', ')}`, stackTrace);
    }

    return { status, messages, errorCode };
  }

  /** Assembles the `ErrorResponse` object from the classified error and request metadata. */
  private buildErrorResponse(request: Request, classified: ClassifiedError): ErrorResponse {
    const errorResponse = new ErrorResponse();
    errorResponse.messages = [...classified.messages];
    errorResponse.stackTrace = classified.stackTrace;
    errorResponse.traceId = getTraceId() || resolveTraceId(request.headers);
    errorResponse.status = classified.status;

    if (classified.errorCode) {
      errorResponse.setErrorCode(classified.errorCode);
    }

    return errorResponse;
  }

  /** Publishes an `AppTechnicalError` event via `EventBus` for every 5xx response. */
  private emitTechnicalError(status: number, errorResponse: ErrorResponse): void {
    if (status < HttpStatus.INTERNAL_SERVER_ERROR || !this.eventBus) return;

    const payload: TechnicalErrorPayload = {
      messages: [...errorResponse.messages],
      status: errorResponse.status,
      stackTrace: errorResponse.stackTrace,
      errorCode: errorResponse.errorCode,
      traceId: errorResponse.traceId,
    };
    this.eventBus.publish(new AppTechnicalError(payload));
  }

  /** Logs the request path, method, and status code for 5xx errors and 400 validation failures. */
  private logRequestContext(request: Request, { status, messages, stackTrace }: ClassifiedError): void {
    if (status < HttpStatus.BAD_REQUEST) return;

    const logDetails = {
      path: request.url,
      method: request.method,
      statusCode: status,
      traceId: getTraceId(),
      stack: stackTrace,
    };
    const context = JSON.stringify(logDetails, null, 2);
    const summary = `Exception caught: ${status} - ${messages.join(', ')}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(summary, context);
    } else if (status === HttpStatus.BAD_REQUEST) {
      this.logger.warn(summary, context);
    }
  }

  /**
   * Removes internal details from the response before it reaches the client.
   * Stack traces are always stripped in non-local environments. The error
   * message is replaced for 5xx non-business errors to avoid leaking internals.
   * Business-error messages were already resolved to safe text during
   * classification in every environment.
   */
  private sanitiseForClient(
    exception: unknown,
    status: number,
    errorResponse: ErrorResponse,
  ): void {
    if (exception instanceof BusinessError) {
      delete errorResponse.stackTrace;
      return;
    }

    if (!this.maskErrors) return;

    delete errorResponse.stackTrace;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.messages = ['An internal server error occurred. Please try again later.'];
    }
  }

  private readStackTrace(exception: unknown): string | undefined {
    if (exception instanceof Error) {
      return exception.stack;
    }
    if (typeof exception === 'object' && exception !== null && 'stack' in exception) {
      const stack = (exception as { stack?: unknown }).stack;
      return typeof stack === 'string' ? stack : undefined;
    }
    return undefined;
  }
}
