import { ObservabilityOptionsSchema, normalizeEnvironment } from '@ssdev-toolkit/nestjs-observability';

describe('ObservabilityOptionsSchema', () => {
  it('accepts an empty object (all optional)', () => {
    const result = ObservabilityOptionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts full Slack configuration', () => {
    const result = ObservabilityOptionsSchema.safeParse({
      slack: { webhookUrl: 'https://hooks.slack.com/services/xxx' },
      alertOnEnvironments: ['production', 'staging'],
      environment: 'production',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid slack.webhookUrl', () => {
    const result = ObservabilityOptionsSchema.safeParse({
      slack: { webhookUrl: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts environment gating configuration', () => {
    const result = ObservabilityOptionsSchema.safeParse({
      environment: 'qa',
      alertOnEnvironments: ['prod', 'qa'],
    });
    expect(result.success).toBe(true);
  });

  it('defaults alertOnEnvironments to ["prod"]', () => {
    const result = ObservabilityOptionsSchema.parse({});
    expect(result.alertOnEnvironments).toContain('prod');
  });

  it('defaults includeStackTrace to false (no leak by default)', () => {
    const result = ObservabilityOptionsSchema.parse({});
    expect(result.includeStackTrace).toBe(false);
    expect(result.mentionChannel).toBe(false);
  });
});

describe('normalizeEnvironment', () => {
  it('maps NODE_ENV=production to prod so default gating matches', () => {
    expect(normalizeEnvironment('production')).toBe('prod');
  });

  it('lowercases and trims and maps common aliases', () => {
    expect(normalizeEnvironment('  PROD ')).toBe('prod');
    expect(normalizeEnvironment('development')).toBe('dev');
    expect(normalizeEnvironment('stage')).toBe('staging');
    expect(normalizeEnvironment(undefined)).toBe('unknown');
  });
});
