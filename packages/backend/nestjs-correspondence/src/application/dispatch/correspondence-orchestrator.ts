import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { NotificationSpec } from '../model/notification-spec';
import { SubscriptionResolutionService } from './subscription-resolution.service';
import { INotificationRepository } from '../../domain/repositories/notification.repository';
import { IDispatchQueuePort } from '../../domain/ports/dispatch-queue.port';
import { Notification } from '../../domain/aggregates/notification.aggregate';
import { UserNotification } from '../../domain/aggregates/user-notification.aggregate';
import { NotificationPriority } from '../../domain/enums/notification-type.enum';

/**
 * Conductor of the correspondence dispatch pipeline and the single convergence
 * point for both trigger paths (event resolvers and the facade). For one
 * {@link NotificationSpec} it resolves recipients via
 * {@link SubscriptionResolutionService}, optionally persists the in-app
 * `Notification` + per-user `UserNotification`s and publishes their domain
 * events, then enqueues asynchronous email/push delivery through
 * {@link IDispatchQueuePort}. Performs no delivery itself — that runs later in
 * the queue worker (`CorrespondenceDispatchHandler`).
 */
@Injectable()
export class CorrespondenceOrchestrator {
  private readonly logger = new Logger(CorrespondenceOrchestrator.name);

  constructor(
    private readonly resolutionService: SubscriptionResolutionService,
    @Inject(INotificationRepository)
    private readonly notificationRepo: INotificationRepository,
    @Optional() @Inject(IDispatchQueuePort)
    private readonly dispatchQueue: IDispatchQueuePort,
    private readonly eventBus: EventBus,
  ) { }

  /**
   * Core dispatch pipeline: resolve recipients, persist the in-app notification
   * (when requested), and enqueue async email/push delivery.
   */
  async dispatch(spec: NotificationSpec): Promise<void> {
    const dispatchId = randomUUID();
    this.logger.log(`Processing correspondence dispatchId=${dispatchId}`);

    try {
      const { inApp, email, push } = spec.channels;

      const resolved = await this.resolutionService.resolve(
        spec.recipients,
        email?.overrideEmails,
        email?.cc,
      );

      if (resolved.targetUserIds.length === 0 && resolved.emailTo.length === 0) {
        this.logger.warn(`dispatchId=${dispatchId} resolved to zero recipients — skipping.`);
        return;
      }

      // Persist the in-app notification record only when the inApp channel is requested.
      let notificationId: string | undefined;
      let userNotificationIds: string[] | undefined;

      if (inApp) {
        const notification = Notification.create({
          title: inApp.title,
          body: inApp.body,
          type: inApp.type,
          category: inApp.category,
          priority: inApp.priority ?? NotificationPriority.NORMAL,
          action: inApp.action,
          referenceId: inApp.referenceId,
          referenceType: inApp.referenceType,
          imageUrl: inApp.imageUrl,
          icon: inApp.icon,
          metadata: inApp.metadata,
          expiresAt: inApp.expiresAt,
          dispatchId,
        });

        const userNotifications = resolved.targetUserIds.map((uid) =>
          UserNotification.create({ notificationId: notification.id, userId: uid }),
        );

        await this.notificationRepo.createWithUserNotifications(notification, userNotifications);
        notificationId = notification.id;

        const notifEvents = [...notification.domainEvents];
        notification.clearEvents();
        this.eventBus.publishAll(notifEvents);

        const pushUserIdSet = new Set(resolved.pushUserIds);
        userNotificationIds = userNotifications
          .filter((un) => pushUserIdSet.has(un.userId))
          .map((un) => un.id);
      }

      await this.dispatchQueue.enqueue({
        dispatchId,
        notificationId,
        targetUserIds: resolved.targetUserIds,
        userNotificationIds,
        pushUserIds: resolved.pushUserIds,
        templateKey: email?.templateKey,
        templateData: email?.templateData,
        emailAddresses: resolved.emailTo,
        ccAddresses: resolved.emailCc,
        sendEmail: !!email?.templateKey && resolved.emailTo.length > 0,
        sendPush: (push?.enabled ?? false) && resolved.pushUserIds.length > 0,
        attachments: email?.attachments,
      });

      this.logger.log(
        `dispatchId=${dispatchId} queued — ` +
        `inApp=${!!inApp}, ` +
        `users=${resolved.targetUserIds.length}, ` +
        `emailTo=${resolved.emailTo.length}, ` +
        `pushUsers=${resolved.pushUserIds.length}`,
      );
    } catch (error) {
      this.logger.error(
        `dispatchId=${dispatchId} orchestration failed`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
