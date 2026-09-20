import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class InvalidCronExpressionError extends BusinessError {
  constructor(expression: string) {
    super(
      `Invalid cron expression: "${expression}". Expected a valid 5-part UNIX cron string (e.g. "0 8 * * *").`,
      'INVALID_CRON_EXPRESSION',
    );
  }
}

export class CronJobNotFoundError extends BusinessError {
  constructor(name: string) {
    super(`Cron job "${name}" not found.`, 'CRON_JOB_NOT_FOUND', 404);
  }
}

export class CronJobAlreadyExistsError extends BusinessError {
  constructor(name: string) {
    super(
      `A cron job with name "${name}" already exists. Use PUT /cron/jobs/:name to update it.`,
      'CRON_JOB_ALREADY_EXISTS',
      409,
    );
  }
}

export class InvalidTriggerTimestampError extends BusinessError {
  constructor(message: string) {
    super(message, 'CRON_INVALID_TRIGGER_TIMESTAMP', 400);
  }
}
