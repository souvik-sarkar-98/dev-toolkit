import { Inject, Injectable, Optional } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CommentAddedEvent } from '../../../../domain/events/comment-added.event';
import { COMMENT_OPTIONS } from '../../../../infrastructure/comment-options.token';
import { CommentModuleOptions } from '../../../../comment.schema';
import {
  COMMENT_NOTIFICATION_PORT,
  ICommentNotificationPort,
} from '../../../ports/comment-notification.port';

/**
 * Notifies active resource subscribers of the parent entity via the outbound
 * notification port. Wording/channels are owned by the host adapter.
 *
 * Suppressed when options.notifications.notifySubscribers === false, or when no
 * notification adapter is registered.
 */
@EventsHandler(CommentAddedEvent)
@Injectable()
export class OnCommentAddedSubscriberHandler implements IEventHandler<CommentAddedEvent> {
  constructor(
    @Inject(COMMENT_OPTIONS) private readonly options: CommentModuleOptions,
    @Optional()
    @Inject(COMMENT_NOTIFICATION_PORT)
    private readonly notificationPort: ICommentNotificationPort | null,
  ) {}

  async handle(event: CommentAddedEvent): Promise<void> {
    if (this.options.notifications?.notifySubscribers === false) return;
    if (!this.notificationPort) return;

    const comment = event.snapshot;

    // Exclude the comment author and any @mentioned users — they receive
    // dedicated notifications and should not get a duplicate subscriber alert.
    const excludeUserIds = [
      comment.authorId,
      ...comment.mentionItems.map((m) => m.mentionedUserId),
    ];

    await this.notificationPort.notifyCommentAdded({
      commentId: comment.id,
      entityType: comment.entityType,
      entityId: comment.entityId,
      authorName: comment.authorName,
      excludeUserIds,
    });
  }
}
