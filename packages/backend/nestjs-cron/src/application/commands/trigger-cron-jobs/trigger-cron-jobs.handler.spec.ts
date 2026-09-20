/**
 * TriggerCronJobsHandler unit tests — mock all dependencies.
 *
 * Covers the CQRS equivalent of the legacy CronService.triggerScheduledJobs().
 * Ported from: test/cron/cron.service.spec.ts (triggerScheduledJobs section)
 */
import { TriggerCronJobsHandler } from './trigger-cron-jobs.handler';
import { TriggerCronJobsCommand } from './trigger-cron-jobs.command';
import { ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { ICronJobQueuePort } from '../../../domain/ports/cron-job-queue.port';
import { Cron2ModuleOptions } from '../../../cron.schema';
import { CronJob } from '../../../domain/models/cron-job.model';

// Fixed reference instant — 2026-01-01 10:00 UTC.
const NOW_ISO = '2026-01-01T10:00:00.000Z';
const NOW = new Date(NOW_ISO);

function buildHandler(jobs: CronJob[], options: Cron2ModuleOptions = { timezone: 'UTC' }) {
  const store: jest.Mocked<ICronJobStorePort> = {
    findAll: jest.fn().mockResolvedValue(jobs),
    findByName: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };
  const queue: jest.Mocked<ICronJobQueuePort> = {
    enqueue: jest.fn().mockResolvedValue({ id: 'queue-job-123' }),
  };
  const handler = new TriggerCronJobsHandler(store, queue, options);
  return { handler, store, queue };
}

const dueJob: CronJob = {
  name: 'send-digest',
  description: 'Sends the daily digest',
  expression: '0 10 * * *', // fires at 10:00 UTC — matches NOW exactly
  handler: 'SendDigestJob',
  enabled: true,
};

const notDueJob: CronJob = {
  name: 'midnight-report',
  description: 'Midnight report',
  expression: '0 23 * * *', // fires at 23:00 UTC — far from NOW
  handler: 'MidnightReportJob',
  enabled: true,
};

const disabledJob: CronJob = {
  name: 'disabled-job',
  description: 'A disabled job',
  expression: '0 10 * * *', // would be due, but disabled
  handler: 'DisabledHandler',
  enabled: false,
};

describe('TriggerCronJobsHandler', () => {
  describe('execute()', () => {
    it('enqueues a due enabled job and returns it in enqueuedJobs', async () => {
      const { handler, queue } = buildHandler([dueJob]);

      const result = await handler.execute(new TriggerCronJobsCommand(NOW_ISO));

      expect(queue.enqueue).toHaveBeenCalledWith(
        dueJob.name,
        dueJob.handler,
        dueJob.inputData,
        expect.any(Date),
      );
      expect(result.enqueuedJobs).toHaveLength(1);
      expect(result.enqueuedJobs[0].jobName).toBe('send-digest');
      expect(result.enqueuedJobs[0].queueJobId).toBe('queue-job-123');
    });

    it('skips a disabled job with reason DISABLED', async () => {
      const { handler, queue } = buildHandler([disabledJob]);

      const result = await handler.execute(new TriggerCronJobsCommand(NOW_ISO));

      expect(queue.enqueue).not.toHaveBeenCalled();
      expect(result.skippedJobs).toHaveLength(1);
      expect(result.skippedJobs[0].jobName).toBe('disabled-job');
      expect(result.skippedJobs[0].reason).toBe('DISABLED');
    });

    it('skips a job not yet due with reason SCHEDULE_NOT_MATCHED', async () => {
      const { handler, queue } = buildHandler([notDueJob]);

      const result = await handler.execute(new TriggerCronJobsCommand(NOW_ISO));

      expect(queue.enqueue).not.toHaveBeenCalled();
      expect(result.skippedJobs).toHaveLength(1);
      expect(result.skippedJobs[0].jobName).toBe('midnight-report');
      expect(result.skippedJobs[0].reason).toBe('SCHEDULE_NOT_MATCHED');
    });

    it('processes a mixed list — enqueues due, skips disabled and not-due', async () => {
      const { handler, queue } = buildHandler([dueJob, notDueJob, disabledJob]);

      const result = await handler.execute(new TriggerCronJobsCommand(NOW_ISO));

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(result.enqueuedJobs).toHaveLength(1);
      expect(result.skippedJobs).toHaveLength(2);
    });

    it('returns empty arrays when no jobs exist', async () => {
      const { handler } = buildHandler([]);

      const result = await handler.execute(new TriggerCronJobsCommand(NOW_ISO));

      expect(result.enqueuedJobs).toEqual([]);
      expect(result.skippedJobs).toEqual([]);
    });

    it('forwards inputData as the queue payload', async () => {
      const jobWithData: CronJob = { ...dueJob, inputData: { region: 'eu' } };
      const { handler, queue } = buildHandler([jobWithData]);

      await handler.execute(new TriggerCronJobsCommand(NOW_ISO));

      expect(queue.enqueue).toHaveBeenCalledWith(
        dueJob.name,
        dueJob.handler,
        { region: 'eu' },
        expect.any(Date),
      );
    });

    it('uses current time when no timestamp is provided', async () => {
      const { handler, store } = buildHandler([dueJob]);
      store.findAll.mockResolvedValue([]);

      await handler.execute(new TriggerCronJobsCommand());

      expect(store.findAll).toHaveBeenCalled();
    });

    it('honors a non-default timezone (Asia/Kolkata) when evaluating schedules', async () => {
      // 04:30 UTC == 10:00 IST → expression "0 10 * * *" should fire
      const { handler, queue } = buildHandler([dueJob], { timezone: 'Asia/Kolkata' });

      const result = await handler.execute(
        new TriggerCronJobsCommand('2026-01-01T04:30:00.000Z'),
      );

      expect(queue.enqueue).toHaveBeenCalled();
      expect(result.enqueuedJobs).toHaveLength(1);
    });

    it('passes the scheduledAt date to the queue for deterministic jobId generation', async () => {
      const { handler, queue } = buildHandler([dueJob]);

      await handler.execute(new TriggerCronJobsCommand(NOW_ISO));

      const [, , , scheduledAt] = queue.enqueue.mock.calls[0];
      expect(scheduledAt).toBeInstanceOf(Date);
    });
  });
});
