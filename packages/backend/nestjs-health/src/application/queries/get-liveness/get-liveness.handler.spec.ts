import { ServiceStatus } from '../../../domain/enums/service-status.enum';
import { HealthOptionsSchema, type HealthModuleOptions } from '../../../health.schema';
import { GetLivenessHandler } from './get-liveness.handler';

const options = (overrides: Partial<HealthModuleOptions> = {}): HealthModuleOptions => ({
  ...HealthOptionsSchema.parse({}),
  ...overrides,
});

describe('GetLivenessHandler', () => {
  it('always reports ok with a timestamp', async () => {
    const result = await new GetLivenessHandler(options()).execute();

    expect(result.status).toBe(ServiceStatus.OK);
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('omits service and version when they are not configured', async () => {
    const result = await new GetLivenessHandler(options()).execute();

    expect(result).not.toHaveProperty('service');
    expect(result).not.toHaveProperty('version');
  });

  it('includes the configured service identity', async () => {
    const result = await new GetLivenessHandler(
      options({ serviceName: 'orders-api', version: '1.4.2' }),
    ).execute();

    expect(result.service).toBe('orders-api');
    expect(result.version).toBe('1.4.2');
  });
});
