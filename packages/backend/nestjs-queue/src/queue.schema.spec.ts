import { QueueOptionsSchema } from '@ssdev-toolkit/nestjs-queue/queue.schema';

describe('QueueOptionsSchema', () => {
  it('accepts a URL-based connection', () => {
    const result = QueueOptionsSchema.safeParse({
      connection: { url: 'redis://localhost:6379' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a host/port connection', () => {
    const result = QueueOptionsSchema.safeParse({
      connection: { host: 'redis-host', port: 6379 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing connection', () => {
    const result = QueueOptionsSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((e) => e.path.join('.'));
      expect(paths).toContain('connection');
    }
  });

  it('rejects connection with neither url nor host', () => {
    const result = QueueOptionsSchema.safeParse({
      connection: { password: 'secret' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(
        /Provide either connection\.url or connection\.host/,
      );
    }
  });

  it('defaults concurrency to 1', () => {
    const result = QueueOptionsSchema.parse({
      connection: { url: 'redis://localhost' },
    });
    expect(result.concurrency).toBe(1);
  });

  it('accepts custom concurrency', () => {
    const result = QueueOptionsSchema.parse({
      connection: { url: 'redis://localhost' },
      concurrency: 5,
    });
    expect(result.concurrency).toBe(5);
  });

  it('rejects negative concurrency', () => {
    const result = QueueOptionsSchema.safeParse({
      connection: { url: 'redis://localhost' },
      concurrency: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative connection port', () => {
    const result = QueueOptionsSchema.safeParse({
      connection: { host: 'localhost', port: -1 },
    });
    expect(result.success).toBe(false);
  });
});
