/**
 * RunCronJobHandler unit tests — mock all dependencies.
 *
 * Covers the CQRS equivalent of the legacy CronService.runScheduledJob().
 * Ported from: test/cron/cron.service.spec.ts (runScheduledJob section)
 */
import { RunCronJobHandler } from './run-cron-job.handler';
import { RunCronJobCommand } from './run-cron-job.command';
import { CronJobNotFoundError } from '../../../domain/errors/cron.errors';
import { ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { ICronJobQueuePort } from '../../../domain/ports/cron-job-queue.port';
import { CronJob } from '../../../domain/models/cron-job.model';

const existingJob: CronJob = {
  name: 'send-digest',
  description: 'Sends the daily digest',
  expression: '0 10 * * *',
  handler: 'SendDigestJob',
  enabled: true,
  inputData: { region: 'eu' },
};

function buildHandler(existing: CronJob | null = existingJob) {
  const store: jest.Mocked<ICronJobStorePort> = {
    findAll: jest.fn(),
    findByName: jest.fn().mockResolvedValue(existing),
    upsert: jest.fn(),
    delete: jest.fn(),
  };
  const queue: jest.Mocked<ICronJobQueuePort> = {
    enqueue: jest.fn().mockResolvedValue({ id: 'queue-job-456' }),
  };
  const handler = new RunCronJobHandler(store, queue);
  return { handler, store, queue };
}

describe('RunCronJobHandler', () => {
  describe('execute()', () => {
    it('enqueues the job immediately and returns the queue job id', async () => {
      const { handler } = buildHandler();

      const result = await handler.execute(new RunCronJobCommand('send-digest'));

      expect(result).toEqual({ id: 'queue-job-456' });
    });

    it('calls store.findByName with the job name from the command', async () => {
      const { handler, store } = buildHandler();

      await handler.execute(new RunCronJobCommand('send-digest'));

      expect(store.findByName).toHaveBeenCalledWith('send-digest');
    });

    it('uses the job handler name (not the job name) as the BullMQ job name', async () => {
      const { handler, queue } = buildHandler();

      await handler.execute(new RunCronJobCommand('send-digest'));

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        'SendDigestJob',
        expect.anything(),
        expect.any(Date),
      );
    });

    it("falls back to the job's stored inputData when no override is provided", async () => {
      const { handler, queue } = buildHandler();

      await handler.execute(new RunCronJobCommand('send-digest'));

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { region: 'eu' },
        expect.any(Date),
      );
    });

    it('uses the command inputData when provided, overriding the stored one', async () => {
      const { handler, queue } = buildHandler();

      await handler.execute(new RunCronJobCommand('send-digest', { region: 'us' }));

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { region: 'us' },
        expect.any(Date),
      );
    });

    it('passes a Date as scheduledAt for deterministic queue jobId generation', async () => {
      const { handler, queue } = buildHandler();

      await handler.execute(new RunCronJobCommand('send-digest'));

      const [, , , scheduledAt] = queue.enqueue.mock.calls[0];
      expect(scheduledAt).toBeInstanceOf(Date);
    });

    it('throws CronJobNotFoundError when the job does not exist', async () => {
      const { handler } = buildHandler(null);

      await expect(
        handler.execute(new RunCronJobCommand('missing-job')),
      ).rejects.toThrow(CronJobNotFoundError);
    });

    it('does not call queue.enqueue when the job is not found', async () => {
      const { handler, queue } = buildHandler(null);

      await expect(handler.execute(new RunCronJobCommand('missing'))).rejects.toThrow();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('works with a job that has no stored inputData', async () => {
      const jobWithoutData: CronJob = { ...existingJob, inputData: undefined };
      const { handler, queue } = buildHandler(jobWithoutData);

      await handler.execute(new RunCronJobCommand('send-digest'));

      expect(queue.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        'SendDigestJob',
        undefined,
        expect.any(Date),
      );
    });
  });
});
