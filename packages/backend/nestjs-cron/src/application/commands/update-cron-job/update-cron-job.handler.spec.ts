/**
 * UpdateCronJobHandler unit tests — mock all dependencies.
 * Supersedes (partially): test/cron/cron-job-definitions.service.spec.ts (updateJob coverage)
 */
import { UpdateCronJobHandler } from './update-cron-job.handler';
import { UpdateCronJobCommand } from './update-cron-job.command';
import { CronJobNotFoundError, InvalidCronExpressionError } from '../../../domain/errors/cron.errors';
import { ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { CronJob } from '../../../domain/models/cron-job.model';

const existingJob: CronJob = {
  name: 'send-digest',
  description: 'Sends the daily digest',
  expression: '0 10 * * *',
  handler: 'SendDigestJob',
  enabled: true,
};

function buildHandler(existing: CronJob | null = existingJob) {
  const store: jest.Mocked<ICronJobStorePort> = {
    findAll: jest.fn(),
    findByName: jest.fn().mockResolvedValue(existing),
    upsert: jest.fn().mockImplementation(async (job: CronJob) => job),
    delete: jest.fn(),
  };
  const handler = new UpdateCronJobHandler(store);
  return { handler, store };
}

describe('UpdateCronJobHandler', () => {
  describe('execute()', () => {
    it('calls store.upsert with the merged job when the job exists', async () => {
      const { handler, store } = buildHandler();

      await handler.execute(new UpdateCronJobCommand('send-digest', { enabled: false }));

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'send-digest', enabled: false }),
      );
    });

    it('returns the updated job', async () => {
      const { handler } = buildHandler();

      const result = await handler.execute(
        new UpdateCronJobCommand('send-digest', { description: 'New description' }),
      );

      expect(result.description).toBe('New description');
    });

    it('preserves fields not included in the patch', async () => {
      const { handler } = buildHandler();

      const result = await handler.execute(
        new UpdateCronJobCommand('send-digest', { enabled: false }),
      );

      expect(result.expression).toBe('0 10 * * *');
      expect(result.handler).toBe('SendDigestJob');
    });

    it('throws CronJobNotFoundError when the job does not exist', async () => {
      const { handler, store } = buildHandler(null);

      await expect(
        handler.execute(new UpdateCronJobCommand('missing', { enabled: false })),
      ).rejects.toThrow(CronJobNotFoundError);
      expect(store.upsert).not.toHaveBeenCalled();
    });

    it('throws InvalidCronExpressionError when the patch contains an invalid expression', async () => {
      const { handler, store } = buildHandler();

      await expect(
        handler.execute(new UpdateCronJobCommand('send-digest', { expression: 'bad-expr' })),
      ).rejects.toThrow(InvalidCronExpressionError);
      expect(store.upsert).not.toHaveBeenCalled();
    });

    it('does NOT validate the expression when the patch omits it', async () => {
      const { handler, store } = buildHandler();

      await handler.execute(new UpdateCronJobCommand('send-digest', { enabled: false }));

      expect(store.upsert).toHaveBeenCalledTimes(1);
    });

    it('allows updating inputData', async () => {
      const { handler, store } = buildHandler();

      await handler.execute(
        new UpdateCronJobCommand('send-digest', { inputData: { region: 'us' } }),
      );

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ inputData: { region: 'us' } }),
      );
    });
  });
});
