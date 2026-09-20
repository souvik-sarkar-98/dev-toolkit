/**
 * RetentionSchedulerService unit tests.
 *
 * Adapted from test/correspondence/retention-scheduler.service.spec.ts,
 * updated to correspondence module's two-job model (purge-notifications + purge-subscriptions).
 *
 * Covers:
 *  - Schedules both retention jobs at bootstrap with default crons
 *  - Uses default retention day values when not overridden
 *  - Respects custom retention days
 *  - Swallows scheduling errors (logs, does not throw)
 */

// Mock axios and @nestjs/axios to avoid missing peer dependency via @ssdev-toolkit/nestjs-queue transitive imports
jest.mock('axios', () => ({}), { virtual: true });
jest.mock('@nestjs/axios', () => ({ HttpModule: class { }, HttpService: class { } }), {
  virtual: true,
});

import { Logger } from '@nestjs/common';
import { QueueFacade } from '@ssdev-toolkit/nestjs-queue';
import { RetentionSchedulerService } from '@ssdev-toolkit/nestjs-correspondence/application/retention/retention-scheduler.service';
import { PurgeNotificationsJob, PurgeSubscriptionsJob } from '@ssdev-toolkit/nestjs-correspondence/application/jobs/retention.jobs';
import { INotificationRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/notification.repository';
import { IResourceSubscriptionRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/resource-subscription.repository';

// ── Helpers ────────────────────────────────────────────────────────────────

function buildService(options: Partial<{
  notificationRetentionDays: number;
  inactiveSubscriptionRetentionDays: number;
}> = {}) {
  const queueBus: jest.Mocked<QueueFacade> = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  } as any;

  const notificationRepo: jest.Mocked<INotificationRepository> = {
    deleteExpiredBefore: jest.fn().mockResolvedValue(0),
  } as any;

  const subscriptionRepo: jest.Mocked<IResourceSubscriptionRepository> = {
    deleteInactiveBefore: jest.fn().mockResolvedValue(0),
  } as any;

  const moduleOptions = { retention: options };

  const svc = new RetentionSchedulerService(
    queueBus,
    notificationRepo,
    subscriptionRepo,
    moduleOptions as any,
  );

  return { svc, queueBus, notificationRepo, subscriptionRepo };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RetentionSchedulerService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
  });
  afterEach(() => jest.restoreAllMocks());

  it('dispatches PurgeNotificationsJob on bootstrap', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    const jobInstances = (queueBus.dispatch as jest.Mock).mock.calls.map((c) => c[0]);
    expect(jobInstances.some((j) => j instanceof PurgeNotificationsJob)).toBe(true);
  });

  it('dispatches PurgeSubscriptionsJob on bootstrap', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    const jobInstances = (queueBus.dispatch as jest.Mock).mock.calls.map((c) => c[0]);
    expect(jobInstances.some((j) => j instanceof PurgeSubscriptionsJob)).toBe(true);
  });

  it('dispatches exactly two jobs', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    expect(queueBus.dispatch).toHaveBeenCalledTimes(2);
  });

  it('uses default 90-day retention for notifications', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    const notifCall = (queueBus.dispatch as jest.Mock).mock.calls.find(
      (c) => c[0] instanceof PurgeNotificationsJob,
    );
    expect(notifCall![0].payload.retentionDays).toBe(90);
  });

  it('uses default 180-day retention for subscriptions', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    const subCall = (queueBus.dispatch as jest.Mock).mock.calls.find(
      (c) => c[0] instanceof PurgeSubscriptionsJob,
    );
    expect(subCall![0].payload.retentionDays).toBe(180);
  });

  it('respects custom notificationRetentionDays', () => {
    const { svc, queueBus } = buildService({ notificationRetentionDays: 30 });
    svc.onApplicationBootstrap();
    const notifCall = (queueBus.dispatch as jest.Mock).mock.calls.find(
      (c) => c[0] instanceof PurgeNotificationsJob,
    );
    expect(notifCall![0].payload.retentionDays).toBe(30);
  });

  it('respects custom inactiveSubscriptionRetentionDays', () => {
    const { svc, queueBus } = buildService({ inactiveSubscriptionRetentionDays: 60 });
    svc.onApplicationBootstrap();
    const subCall = (queueBus.dispatch as jest.Mock).mock.calls.find(
      (c) => c[0] instanceof PurgeSubscriptionsJob,
    );
    expect(subCall![0].payload.retentionDays).toBe(60);
  });

  it('dispatches PurgeNotificationsJob with jobId corr2-purge-notifications', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    const notifCall = (queueBus.dispatch as jest.Mock).mock.calls.find(
      (c) => c[0] instanceof PurgeNotificationsJob,
    );
    expect(notifCall![1].jobId).toBe('corr2-purge-notifications');
  });

  it('dispatches PurgeSubscriptionsJob with jobId corr2-purge-subscriptions', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    const subCall = (queueBus.dispatch as jest.Mock).mock.calls.find(
      (c) => c[0] instanceof PurgeSubscriptionsJob,
    );
    expect(subCall![1].jobId).toBe('corr2-purge-subscriptions');
  });

  it('uses daily repeat cron for notifications (02:00)', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    const notifCall = (queueBus.dispatch as jest.Mock).mock.calls.find(
      (c) => c[0] instanceof PurgeNotificationsJob,
    );
    expect(notifCall![1].repeat?.pattern).toBe('0 2 * * *');
  });

  it('uses weekly repeat cron for subscriptions (Sunday 03:00)', () => {
    const { svc, queueBus } = buildService();
    svc.onApplicationBootstrap();
    const subCall = (queueBus.dispatch as jest.Mock).mock.calls.find(
      (c) => c[0] instanceof PurgeSubscriptionsJob,
    );
    expect(subCall![1].repeat?.pattern).toBe('0 3 * * 0');
  });

  it('swallows dispatch errors — does not throw from onApplicationBootstrap', () => {
    const errSpy = jest.spyOn(Logger.prototype, 'error');
    const { svc, queueBus } = buildService();
    queueBus.dispatch.mockRejectedValue(new Error('Redis down'));
    // bootstrap returns void, scheduling errors are caught internally
    expect(() => svc.onApplicationBootstrap()).not.toThrow();
  });

  describe('purgeOldNotifications()', () => {
    it('calls notificationRepo.deleteExpiredBefore with a date 90 days ago', async () => {
      const { svc, notificationRepo } = buildService();
      await svc.purgeOldNotifications(90);
      const [cutoff] = (notificationRepo.deleteExpiredBefore as jest.Mock).mock.calls[0];
      const diff = Date.now() - cutoff.getTime();
      expect(diff).toBeGreaterThanOrEqual(89 * 24 * 60 * 60 * 1000);
      expect(diff).toBeLessThan(91 * 24 * 60 * 60 * 1000);
    });
  });

  describe('purgeInactiveSubscriptions()', () => {
    it('calls subscriptionRepo.deleteInactiveBefore with a date N days ago', async () => {
      const { svc, subscriptionRepo } = buildService();
      await svc.purgeInactiveSubscriptions(180);
      const [cutoff] = (subscriptionRepo.deleteInactiveBefore as jest.Mock).mock.calls[0];
      const diff = Date.now() - cutoff.getTime();
      expect(diff).toBeGreaterThanOrEqual(179 * 24 * 60 * 60 * 1000);
      expect(diff).toBeLessThan(181 * 24 * 60 * 60 * 1000);
    });
  });
});
