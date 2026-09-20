/**
 * DeleteCronJobHandler unit tests — mock all dependencies.
 * Supersedes (partially): test/cron/cron-job-definitions.service.spec.ts (deleteJob coverage)
 */
import { DeleteCronJobHandler } from './delete-cron-job.handler';
import { DeleteCronJobCommand } from './delete-cron-job.command';
import { CronJobNotFoundError } from '../../../domain/errors/cron.errors';
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
    upsert: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const handler = new DeleteCronJobHandler(store);
  return { handler, store };
}

describe('DeleteCronJobHandler', () => {
  describe('execute()', () => {
    it('calls store.delete with the job name when the job exists', async () => {
      const { handler, store } = buildHandler();

      await handler.execute(new DeleteCronJobCommand('send-digest'));

      expect(store.delete).toHaveBeenCalledWith('send-digest');
    });

    it('resolves without returning a value (void)', async () => {
      const { handler } = buildHandler();

      const result = await handler.execute(new DeleteCronJobCommand('send-digest'));

      expect(result).toBeUndefined();
    });

    it('throws CronJobNotFoundError when the job does not exist', async () => {
      const { handler, store } = buildHandler(null);

      await expect(
        handler.execute(new DeleteCronJobCommand('missing')),
      ).rejects.toThrow(CronJobNotFoundError);
    });

    it('does not call store.delete when the job is not found', async () => {
      const { handler, store } = buildHandler(null);

      await expect(
        handler.execute(new DeleteCronJobCommand('missing')),
      ).rejects.toThrow();
      expect(store.delete).not.toHaveBeenCalled();
    });

    it('looks up the job by the name from the command', async () => {
      const { handler, store } = buildHandler();

      await handler.execute(new DeleteCronJobCommand('send-digest'));

      expect(store.findByName).toHaveBeenCalledWith('send-digest');
    });
  });
});
