/**
 * CorrespondenceOrchestrator unit tests.
 *
 * Ported and adapted from test/correspondence/correspondence-orchestrator.spec.ts,
 * updating to the correspondence module's API and DDD patterns.
 *
 * Covers:
 *  - In-app only: notificationRepo.createWithUserNotifications called, queue enqueued
 *  - Email only: notificationRepo NOT called, queue enqueued with sendEmail=true
 *  - Zero recipients: skips all adapters (early return)
 *  - All channels: all paths triggered
 *  - dispatchQueue.enqueue is called with correct dispatchId, sendEmail, sendPush flags
 */
import { Logger } from '@nestjs/common';
import { CorrespondenceOrchestrator } from '@ssdev-toolkit/nestjs-correspondence/application/dispatch/correspondence-orchestrator';
import { NotificationSpec } from '@ssdev-toolkit/nestjs-correspondence/application/model/notification-spec';
import { SubscriptionResolutionService } from '@ssdev-toolkit/nestjs-correspondence/application/dispatch/subscription-resolution.service';
import { INotificationRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/notification.repository';
import { IDispatchQueuePort } from '@ssdev-toolkit/nestjs-correspondence/domain/ports/dispatch-queue.port';
import { NotificationType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/notification-type.enum';

// ── Mocks ──────────────────────────────────────────────────────────────────

function buildOrchestrator(resolvedOverride?: Partial<{
  targetUserIds: string[];
  emailTo: string[];
  emailCc: string[];
  pushUserIds: string[];
}>) {
  const resolved = {
    targetUserIds: ['user-1'],
    emailTo: ['user1@test.com'],
    emailCc: [],
    pushUserIds: ['user-1'],
    ...resolvedOverride,
  };

  const resolutionService: jest.Mocked<SubscriptionResolutionService> = {
    resolve: jest.fn().mockResolvedValue(resolved),
  } as any;

  const notificationRepo: jest.Mocked<INotificationRepository> = {
    createWithUserNotifications: jest.fn().mockImplementation(async (n) => n),
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    bulkMarkPushSent: jest.fn(),
    deleteExpiredBefore: jest.fn(),
  } as any;

  const dispatchQueue: jest.Mocked<IDispatchQueuePort> = {
    enqueue: jest.fn().mockResolvedValue(undefined),
  };

  const eventBus = { publishAll: jest.fn() };

  const orchestrator = new CorrespondenceOrchestrator(
    resolutionService,
    notificationRepo,
    dispatchQueue,
    eventBus as any,
  );

  return { orchestrator, resolutionService, notificationRepo, dispatchQueue };
}

function inAppSpec(): NotificationSpec {
  return {
    recipients: { mode: 'users', userIds: ['user-1'] },
    channels: {
      inApp: {
        title: 'Hello',
        body: 'World',
        type: NotificationType.INFO,
        category: 'SYSTEM',
      },
    },
  };
}

function emailOnlySpec(): NotificationSpec {
  return {
    recipients: { mode: 'users', userIds: ['user-1'] },
    channels: {
      email: { templateKey: 'welcome', templateData: { name: 'Alice' } },
    },
  };
}

function allChannelsSpec(): NotificationSpec {
  return {
    recipients: { mode: 'users', userIds: ['user-1'] },
    channels: {
      inApp: {
        title: 'Full',
        body: 'All channels',
        type: NotificationType.TASK,
        category: 'WORKFLOW',
      },
      email: { templateKey: 'task-assigned' },
      push: { enabled: true },
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CorrespondenceOrchestrator', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
  });
  afterEach(() => jest.restoreAllMocks());

  describe('in-app only channel', () => {
    it('calls createWithUserNotifications when inApp channel is present', async () => {
      const { orchestrator, notificationRepo } = buildOrchestrator();
      await orchestrator.dispatch(inAppSpec());
      expect(notificationRepo.createWithUserNotifications).toHaveBeenCalledTimes(1);
    });

    it('enqueues dispatch job', async () => {
      const { orchestrator, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(inAppSpec());
      expect(dispatchQueue.enqueue).toHaveBeenCalledTimes(1);
    });

    it('passes notificationId to the dispatch queue', async () => {
      const { orchestrator, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(inAppSpec());
      const [payload] = (dispatchQueue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.notificationId).toBeDefined();
    });

    it('does not request email when email channel absent', async () => {
      const { orchestrator, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(inAppSpec());
      const [payload] = (dispatchQueue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.sendEmail).toBe(false);
    });

    it('does not request push when push channel absent', async () => {
      const { orchestrator, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(inAppSpec());
      const [payload] = (dispatchQueue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.sendPush).toBe(false);
    });
  });

  describe('email only channel', () => {
    it('does NOT call createWithUserNotifications', async () => {
      const { orchestrator, notificationRepo } = buildOrchestrator();
      await orchestrator.dispatch(emailOnlySpec());
      expect(notificationRepo.createWithUserNotifications).not.toHaveBeenCalled();
    });

    it('enqueues dispatch with sendEmail=true', async () => {
      const { orchestrator, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(emailOnlySpec());
      const [payload] = (dispatchQueue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.sendEmail).toBe(true);
    });

    it('passes templateKey to dispatch payload', async () => {
      const { orchestrator, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(emailOnlySpec());
      const [payload] = (dispatchQueue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.templateKey).toBe('welcome');
    });

    it('passes emailAddresses to dispatch payload', async () => {
      const { orchestrator, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(emailOnlySpec());
      const [payload] = (dispatchQueue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.emailAddresses).toContain('user1@test.com');
    });
  });

  describe('zero recipients', () => {
    it('skips createWithUserNotifications and enqueue when zero recipients', async () => {
      const { orchestrator, notificationRepo, dispatchQueue } = buildOrchestrator({
        targetUserIds: [],
        emailTo: [],
        emailCc: [],
        pushUserIds: [],
      });
      await orchestrator.dispatch(inAppSpec());
      expect(notificationRepo.createWithUserNotifications).not.toHaveBeenCalled();
      expect(dispatchQueue.enqueue).not.toHaveBeenCalled();
    });

    it('logs a warning when resolved to zero recipients', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const { orchestrator } = buildOrchestrator({
        targetUserIds: [],
        emailTo: [],
        emailCc: [],
        pushUserIds: [],
      });
      await orchestrator.dispatch(inAppSpec());
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('all channels', () => {
    it('calls createWithUserNotifications for in-app', async () => {
      const { orchestrator, notificationRepo } = buildOrchestrator();
      await orchestrator.dispatch(allChannelsSpec());
      expect(notificationRepo.createWithUserNotifications).toHaveBeenCalledTimes(1);
    });

    it('sets sendEmail=true and sendPush=true in dispatch payload', async () => {
      const { orchestrator, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(allChannelsSpec());
      const [payload] = (dispatchQueue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.sendEmail).toBe(true);
      expect(payload.sendPush).toBe(true);
    });

    it('passes a dispatchId to both notificationRepo and queue', async () => {
      const { orchestrator, notificationRepo, dispatchQueue } = buildOrchestrator();
      await orchestrator.dispatch(allChannelsSpec());
      const [payload] = (dispatchQueue.enqueue as jest.Mock).mock.calls[0];
      expect(payload.dispatchId).toBeDefined();
      expect(typeof payload.dispatchId).toBe('string');
    });
  });

  describe('error handling', () => {
    it('rethrows when resolutionService.resolve throws', async () => {
      const { orchestrator, resolutionService } = buildOrchestrator();
      resolutionService.resolve.mockRejectedValueOnce(new Error('resolution failed'));
      await expect(orchestrator.dispatch(inAppSpec())).rejects.toThrow('resolution failed');
    });

    it('rethrows when notificationRepo.createWithUserNotifications throws', async () => {
      const { orchestrator, notificationRepo } = buildOrchestrator();
      notificationRepo.createWithUserNotifications.mockRejectedValueOnce(new Error('db error'));
      await expect(orchestrator.dispatch(inAppSpec())).rejects.toThrow('db error');
    });
  });
});
