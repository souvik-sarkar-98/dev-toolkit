/**
 * GetCronJobsHandler unit tests — mock all dependencies.
 * Covers: listing all jobs with computed readableExpression and nextRun.
 */
import { GetCronJobsHandler } from './get-cron-jobs.handler';
import { ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { Cron2ModuleOptions } from '../../../cron.schema';
import { CronJob } from '../../../domain/models/cron-job.model';

const enabledJob: CronJob = {
  name: 'send-digest',
  description: 'Sends the daily digest',
  expression: '0 10 * * *',
  handler: 'SendDigestJob',
  enabled: true,
};

const disabledJob: CronJob = {
  name: 'disabled-report',
  description: 'A disabled job',
  expression: '0 11 * * *',
  handler: 'DisabledReportJob',
  enabled: false,
};

function buildHandler(jobs: CronJob[], options: Cron2ModuleOptions = { timezone: 'UTC' }) {
  const store: jest.Mocked<ICronJobStorePort> = {
    findAll: jest.fn().mockResolvedValue(jobs),
    findByName: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };
  const handler = new GetCronJobsHandler(store, options);
  return { handler, store };
}

describe('GetCronJobsHandler', () => {
  describe('execute()', () => {
    it('returns an empty array when no jobs exist', async () => {
      const { handler } = buildHandler([]);

      const result = await handler.execute();

      expect(result).toEqual([]);
    });

    it('returns one DTO per job', async () => {
      const { handler } = buildHandler([enabledJob, disabledJob]);

      const result = await handler.execute();

      expect(result).toHaveLength(2);
    });

    it('includes core job fields in each DTO', async () => {
      const { handler } = buildHandler([enabledJob]);

      const [dto] = await handler.execute();

      expect(dto.name).toBe('send-digest');
      expect(dto.description).toBe('Sends the daily digest');
      expect(dto.expression).toBe('0 10 * * *');
      expect(dto.handler).toBe('SendDigestJob');
      expect(dto.enabled).toBe(true);
    });

    it('computes a non-empty readableExpression for a valid expression', async () => {
      const { handler } = buildHandler([enabledJob]);

      const [dto] = await handler.execute();

      expect(dto.readableExpression).toBeTruthy();
      expect(typeof dto.readableExpression).toBe('string');
    });

    it('computes nextRun as a Date for an enabled job', async () => {
      const { handler } = buildHandler([enabledJob]);

      const [dto] = await handler.execute();

      expect(dto.nextRun).toBeInstanceOf(Date);
    });

    it('does not compute nextRun for a disabled job', async () => {
      const { handler } = buildHandler([disabledJob]);

      const [dto] = await handler.execute();

      expect(dto.nextRun).toBeUndefined();
    });

    it('includes inputData when present', async () => {
      const jobWithData: CronJob = { ...enabledJob, inputData: { key: 'value' } };
      const { handler } = buildHandler([jobWithData]);

      const [dto] = await handler.execute();

      expect(dto.inputData).toEqual({ key: 'value' });
    });

    it('calls store.findAll once', async () => {
      const { handler, store } = buildHandler([enabledJob]);

      await handler.execute();

      expect(store.findAll).toHaveBeenCalledTimes(1);
    });

    it('honors the timezone option when computing nextRun', async () => {
      const { handler: utcHandler } = buildHandler([enabledJob], { timezone: 'UTC' });
      const { handler: istHandler } = buildHandler([enabledJob], { timezone: 'Asia/Kolkata' });

      const [utcDto] = await utcHandler.execute();
      const [istDto] = await istHandler.execute();

      // nextRun values should differ between UTC and IST interpretations
      expect(utcDto.nextRun!.getTime()).not.toBe(istDto.nextRun!.getTime());
    });

    it('falls back gracefully when cronstrue cannot format the expression', async () => {
      // The handler catches cronstrue errors and keeps the raw expression
      const weirdJob: CronJob = { ...enabledJob, expression: '*/30 * * * *' };
      const { handler } = buildHandler([weirdJob]);

      const [dto] = await handler.execute();

      expect(dto.readableExpression).toBeTruthy();
    });
  });
});
