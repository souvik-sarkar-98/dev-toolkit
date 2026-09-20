/**
 * CreateCronJobHandler unit tests — mock all dependencies.
 * Supersedes (partially): test/cron/cron-job-definitions.service.spec.ts (createJob coverage)
 */
import { CreateCronJobHandler } from './create-cron-job.handler';
import { CreateCronJobCommand } from './create-cron-job.command';
import {
  InvalidCronExpressionError,
  CronJobAlreadyExistsError,
} from '../../../domain/errors/cron.errors';
import { ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { CronJob } from '../../../domain/models/cron-job.model';

const validJob: CronJob = {
  name: 'send-digest',
  description: 'Sends the daily digest',
  expression: '0 10 * * *',
  handler: 'SendDigestJob',
  enabled: true,
};

function buildHandler(jobs: CronJob[] = []) {
  const store: jest.Mocked<ICronJobStorePort> = {
    findAll: jest.fn().mockResolvedValue(jobs),
    findByName: jest.fn().mockImplementation(async (name) => jobs.find((j) => j.name === name) ?? null),
    upsert: jest.fn().mockImplementation(async (job: CronJob) => job),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const handler = new CreateCronJobHandler(store);
  return { handler, store };
}

describe('CreateCronJobHandler', () => {
  describe('execute()', () => {
    it('calls store.upsert with the provided job when the expression is valid', async () => {
      const { handler, store } = buildHandler();

      await handler.execute(new CreateCronJobCommand(validJob));

      expect(store.upsert).toHaveBeenCalledWith(validJob);
    });

    it('returns the upserted job', async () => {
      const { handler } = buildHandler();

      const result = await handler.execute(new CreateCronJobCommand(validJob));

      expect(result).toEqual(validJob);
    });

    it('propagates inputData to the store', async () => {
      const { handler, store } = buildHandler();
      const jobWithData: CronJob = { ...validJob, inputData: { region: 'eu' } };

      await handler.execute(new CreateCronJobCommand(jobWithData));

      expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ inputData: { region: 'eu' } }));
    });

    it('throws InvalidCronExpressionError for an invalid cron expression', async () => {
      const { handler, store } = buildHandler();
      const badJob: CronJob = { ...validJob, expression: 'not-a-cron' };

      await expect(handler.execute(new CreateCronJobCommand(badJob))).rejects.toThrow(
        InvalidCronExpressionError,
      );
      expect(store.upsert).not.toHaveBeenCalled();
    });

    it('does not call store.upsert when the expression is invalid', async () => {
      const { handler, store } = buildHandler();

      await expect(
        handler.execute(new CreateCronJobCommand({ ...validJob, expression: 'bad' })),
      ).rejects.toThrow();
      expect(store.upsert).not.toHaveBeenCalled();
    });

    it('creates an initially-disabled job correctly', async () => {
      const { handler, store } = buildHandler();
      const disabledJob: CronJob = { ...validJob, enabled: false };

      const result = await handler.execute(new CreateCronJobCommand(disabledJob));

      expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
      expect(result.enabled).toBe(false);
    });

    it('throws CronJobAlreadyExistsError when a job with the same name already exists (LOW-1)', async () => {
      const { handler, store } = buildHandler([validJob]);

      await expect(
        handler.execute(new CreateCronJobCommand(validJob)),
      ).rejects.toThrow(CronJobAlreadyExistsError);

      expect(store.upsert).not.toHaveBeenCalled();
    });

    it('does not call store.upsert when the job already exists', async () => {
      const { handler, store } = buildHandler([validJob]);

      await expect(handler.execute(new CreateCronJobCommand(validJob))).rejects.toThrow();

      expect(store.upsert).not.toHaveBeenCalled();
    });
  });
});
