import { QueueJobResponseMapper } from './queue-job-response.mapper';

describe('QueueJobResponseMapper', () => {
  it('does not expose BullMQ failure details, stack traces, or logs', async () => {
    const job = {
      id: 'job-1',
      name: 'send-email',
      data: {},
      opts: {},
      getState: jest.fn().mockResolvedValue('failed'),
      progress: 0,
      returnvalue: undefined,
      failedReason: 'SMTP password rejected for private@example.org',
      stacktrace: ['Error: SMTP password rejected', 'at internal/provider.ts:10'],
      attemptsMade: 3,
      delay: 0,
      timestamp: Date.now(),
    };

    const dto = await QueueJobResponseMapper.toJobDetail(
      job as any,
      ['Failed for private@example.org using token secret-token'],
    );

    expect(dto.failedReason).toBe('Job processing failed.');
    expect(dto.stacktrace).toEqual([]);
    expect(dto.logs).toEqual([]);
    expect(JSON.stringify(dto)).not.toContain('private@example.org');
    expect(JSON.stringify(dto)).not.toContain('secret-token');
    expect(JSON.stringify(dto)).not.toContain('provider.ts');
  });

  it('sanitizes persisted queue failure reasons in search results', () => {
    const dto = QueueJobResponseMapper.toSearchResult({
      id: 'job-1',
      jobName: 'send-email',
      queueName: 'default',
      status: 'failed',
      payload: {},
      failedReason: 'Database error for account acct-123',
      attemptsMade: 1,
      enqueuedAt: new Date(),
    } as any);

    expect(dto.failedReason).toBe('Job processing failed.');
    expect(JSON.stringify(dto)).not.toContain('acct-123');
  });
});
