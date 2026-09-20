import { CronJobPayloadSchema } from './cron-job-payload.schema';

describe('CronJobPayloadSchema', () => {
  it('accepts valid cron job payloads', () => {
    const result = CronJobPayloadSchema.safeParse({
      name: 'daily-report',
      expression: '0 6 * * *',
      description: 'Send daily report',
      handler: 'DailyReportJob',
      enabled: true,
      inputData: { reportType: 'summary' },
    });

    expect(result.success).toBe(true);
  });

  it('rejects payloads missing required fields', () => {
    const result = CronJobPayloadSchema.safeParse({
      name: 'daily-report',
      expression: '0 6 * * *',
    });

    expect(result.success).toBe(false);
  });
});
