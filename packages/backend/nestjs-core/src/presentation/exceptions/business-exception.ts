import { BusinessError } from '../../domain/errors/business-error';
import { resolvePublicErrorMessage } from '../errors/public-error-message.resolver';

/**
 * HTTP-presentable wrapper around `BusinessError`.
 *
 * Extends `BusinessError` so the `GlobalExceptionFilter` continues to
 * recognise it as a deliberate business-rule violation. Client responses use
 * a reviewed public message; the inherited `message` remains diagnostic.
 *
 * Adds `getStatus()` / `getResponse()` to mirror the `HttpException` API
 * expected by presentation-layer consumers and tests.
 */
export class BusinessException extends BusinessError {
  getStatus(): number {
    return this.statusCode;
  }

  getResponse(): { message: string; errorCode: string; statusCode: number } {
    return {
      message: resolvePublicErrorMessage(this),
      errorCode: this.errorCode,
      statusCode: this.statusCode,
    };
  }
}
