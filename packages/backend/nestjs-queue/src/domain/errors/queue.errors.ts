import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class QueueJobInvalidStateTransitionError extends BusinessError {
  constructor(jobId: string, from: string, to: string) {
    super(
      `QueueJob "${jobId}" cannot transition from "${from}" to "${to}"`,
      'QUEUE_JOB_INVALID_STATE_TRANSITION',
      400,
    );
  }
}

export abstract class JobError extends BusinessError {
  public readonly isRetryable: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    isRetryable: boolean,
    errorCode: string,
    context?: Record<string, any>,
  ) {
    super(message, errorCode);
    this.name = this.constructor.name;
    this.isRetryable = isRetryable;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      isRetryable: this.isRetryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

export class TransientJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "TRANSIENT_ERROR", context);
  }
}

export class PermanentJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, false, "PERMANENT_ERROR", context);
  }
}

export class NetworkJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "NETWORK_ERROR", context);
  }
}

export class DatabaseJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "DATABASE_ERROR", context);
  }
}

export class ValidationJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, false, "VALIDATION_ERROR", context);
  }
}

export class ExternalServiceJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "EXTERNAL_SERVICE_ERROR", context);
  }
}

export class RateLimitJobError extends JobError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    context?: Record<string, any>,
  ) {
    super(message, true, "RATE_LIMIT_ERROR", context);
    this.retryAfter = retryAfter;
  }
}

export class TimeoutJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "TIMEOUT_ERROR", context);
  }
}

export class BusinessLogicJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, false, "BUSINESS_LOGIC_ERROR", context);
  }
}

export class ResourceNotFoundJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, false, "RESOURCE_NOT_FOUND", context);
  }
}

export class InsufficientResourcesJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "INSUFFICIENT_RESOURCES", context);
  }
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof JobError) {
    return error.isRetryable;
  }

  const retryablePatterns = [
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /ENETUNREACH/i,
    /timeout/i,
    /network/i,
    /connection/i,
    /503/i,
    /502/i,
    /504/i,
    /429/i,
  ];

  return retryablePatterns.some(
    (pattern) => pattern.test(error.message) || pattern.test(error.name),
  );
}

/** Internal — used by the worker, not exported from index.ts */
export function categorizeError(error: Error): JobError {
  if (error instanceof JobError) return error;

  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ENETUNREACH/i.test(error.message)) {
    return new NetworkJobError(error.message, { originalError: error.name });
  }
  if (/timeout/i.test(error.message)) {
    return new TimeoutJobError(error.message, { originalError: error.name });
  }
  if (/429|rate limit/i.test(error.message)) {
    return new RateLimitJobError(error.message, undefined, { originalError: error.name });
  }
  if (/database|sql|query|prisma/i.test(error.message)) {
    return new DatabaseJobError(error.message, { originalError: error.name });
  }
  if (/validation|invalid|required|missing/i.test(error.message)) {
    return new ValidationJobError(error.message, { originalError: error.name });
  }

  return new TransientJobError(error.message, { originalError: error.name });
}

/** Internal — used by the worker, not exported from index.ts */
export function getRetryDelay(error: Error, attemptNumber: number): number {
  if (error instanceof RateLimitJobError && error.retryAfter) {
    return error.retryAfter;
  }
  if (error instanceof JobError) {
    const baseDelay = Math.pow(2, attemptNumber) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 60000);
  }
  return Math.min(Math.pow(2, attemptNumber) * 1000, 60000);
}
