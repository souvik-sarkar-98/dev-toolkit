/**
 * Cron2 domain errors unit tests.
 * Pure TypeScript — zero framework imports.
 */
import { InvalidCronExpressionError, CronJobNotFoundError } from './cron.errors';
import { BusinessError } from '@ssdev-toolkit/nestjs-core/domain/errors/business-error';

describe('InvalidCronExpressionError', () => {
  it('is an instance of BusinessError', () => {
    const error = new InvalidCronExpressionError('bad-expr');
    expect(error).toBeInstanceOf(BusinessError);
  });

  it('is an instance of Error', () => {
    const error = new InvalidCronExpressionError('bad-expr');
    expect(error).toBeInstanceOf(Error);
  });

  it('includes the expression in the error message', () => {
    const error = new InvalidCronExpressionError('bad-expr');
    expect(error.message).toContain('bad-expr');
  });

  it('carries the INVALID_CRON_EXPRESSION error code', () => {
    const error = new InvalidCronExpressionError('bad-expr');
    expect(error.errorCode).toBe('INVALID_CRON_EXPRESSION');
  });

  it('defaults to HTTP status 400', () => {
    const error = new InvalidCronExpressionError('bad-expr');
    expect(error.statusCode).toBe(400);
  });
});

describe('CronJobNotFoundError', () => {
  it('is an instance of BusinessError', () => {
    const error = new CronJobNotFoundError('my-job');
    expect(error).toBeInstanceOf(BusinessError);
  });

  it('is an instance of Error', () => {
    const error = new CronJobNotFoundError('my-job');
    expect(error).toBeInstanceOf(Error);
  });

  it('includes the job name in the error message', () => {
    const error = new CronJobNotFoundError('my-job');
    expect(error.message).toContain('my-job');
  });

  it('carries the CRON_JOB_NOT_FOUND error code', () => {
    const error = new CronJobNotFoundError('my-job');
    expect(error.errorCode).toBe('CRON_JOB_NOT_FOUND');
  });

  it('carries HTTP status 404', () => {
    const error = new CronJobNotFoundError('my-job');
    expect(error.statusCode).toBe(404);
  });
});
