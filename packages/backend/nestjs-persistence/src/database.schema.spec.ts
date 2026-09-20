import { DatabaseOptionsSchema } from '@ssdev-toolkit/nestjs-persistence/database.schema';

describe('DatabaseOptionsSchema', () => {
  const validOptions = {
    redisUrl: 'redis://localhost:6379',
    prismaClientFactory: () => ({}),
  };

  it('accepts valid options', () => {
    const result = DatabaseOptionsSchema.safeParse(validOptions);
    expect(result.success).toBe(true);
  });

  it('defaults auditedModels to empty array', () => {
    const result = DatabaseOptionsSchema.parse(validOptions);
    expect(result.auditedModels).toEqual([]);
  });

  it('defaults failOnAuditError to false', () => {
    const result = DatabaseOptionsSchema.parse(validOptions);
    expect(result.failOnAuditError).toBe(false);
  });

  it('rejects missing redisUrl', () => {
    const result = DatabaseOptionsSchema.safeParse({
      ...validOptions,
      redisUrl: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid redisUrl (not a URL)', () => {
    const result = DatabaseOptionsSchema.safeParse({
      ...validOptions,
      redisUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing prismaClientFactory', () => {
    const result = DatabaseOptionsSchema.safeParse({
      redisUrl: validOptions.redisUrl,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((e) => e.path.join('.'));
      expect(paths).toContain('prismaClientFactory');
    }
  });

  it('defaults enableAuditExtension to false', () => {
    const result = DatabaseOptionsSchema.parse(validOptions);
    expect(result.enableAuditExtension).toBe(false);
  });

  it('defaults auditCaptureOldValuesModels to empty array', () => {
    const result = DatabaseOptionsSchema.parse(validOptions);
    expect(result.auditCaptureOldValuesModels).toEqual([]);
  });

  it('accepts optional auditCaptureOldValuesModels array', () => {
    const result = DatabaseOptionsSchema.safeParse({
      ...validOptions,
      auditCaptureOldValuesModels: ['Account', 'User'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.auditCaptureOldValuesModels).toEqual(['Account', 'User']);
    }
  });

  it('accepts optional auditedModels array', () => {
    const result = DatabaseOptionsSchema.safeParse({
      ...validOptions,
      auditedModels: ['Account', 'Donation'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.auditedModels).toEqual(['Account', 'Donation']);
    }
  });

  it('rejects negative cacheStoreTtl', () => {
    const result = DatabaseOptionsSchema.safeParse({
      ...validOptions,
      cacheStoreTtl: -1,
    });
    expect(result.success).toBe(false);
  });
});
