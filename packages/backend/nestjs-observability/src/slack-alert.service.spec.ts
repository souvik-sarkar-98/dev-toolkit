import { of, throwError } from 'rxjs';
import { SlackAlertAdapter } from '@ssdev-toolkit/nestjs-observability/infrastructure/adapters/slack-alert.adapter';

function makeService(options: any) {
  const post = jest.fn().mockReturnValue(of({ data: 'ok' }));
  const httpService = { post } as any;
  const service = new SlackAlertAdapter(options, httpService);
  return { service, post };
}

const WEBHOOK = 'https://hooks.slack.com/services/xxx';

describe('SlackAlertService', () => {
  it('returns a no-op when no webhook is configured', async () => {
    const { service, post } = makeService({});
    const result = await service.sendAlert('boom');
    expect(result.success).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it('sends when NODE_ENV=production via alias normalisation against default ["prod"]', async () => {
    const { service, post } = makeService({
      slack: { webhookUrl: WEBHOOK },
      environment: 'production',
      alertOnEnvironments: ['prod'],
    });
    const result = await service.sendAlert('boom');
    expect(result.success).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('skips when environment is not in the allow-list', async () => {
    const { service, post } = makeService({
      slack: { webhookUrl: WEBHOOK },
      environment: 'dev',
      alertOnEnvironments: ['prod'],
    });
    const result = await service.sendAlert('boom');
    expect(result.skipped).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it('passes an HTTP timeout to the webhook call', async () => {
    const { service, post } = makeService({
      slack: { webhookUrl: WEBHOOK },
      environment: 'prod',
      httpTimeoutMs: 1234,
    });
    await service.sendAlert('boom');
    expect(post.mock.calls[0][2]).toMatchObject({ timeout: 1234 });
  });

  it('does not include <!channel> by default', async () => {
    const { service, post } = makeService({
      slack: { webhookUrl: WEBHOOK },
      environment: 'prod',
    });
    await service.sendAlert('boom');
    expect(post.mock.calls[0][1].text).not.toContain('<!channel>');
  });

  it('throttles repeated identical alerts within the dedupe interval', async () => {
    const { service, post } = makeService({
      slack: { webhookUrl: WEBHOOK },
      environment: 'prod',
      dedupeIntervalMs: 60_000,
    });
    const first = await service.sendAlert('same message');
    const second = await service.sendAlert('same message');
    expect(first.success).toBe(true);
    expect(second.skipped).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does not crash the caller when the webhook call fails', async () => {
    const post = jest.fn().mockReturnValue(throwError(() => new Error('network')));
    const service = new SlackAlertAdapter(
      { slack: { webhookUrl: WEBHOOK }, environment: 'prod' } as any,
      { post } as any,
    );
    const result = await service.sendAlert('boom');
    expect(result.success).toBe(false);
    expect(result.error).toContain('network');
  });
});
