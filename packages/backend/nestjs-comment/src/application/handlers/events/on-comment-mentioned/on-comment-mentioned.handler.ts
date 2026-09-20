import { Inject, Injectable, Optional } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CommentMentionEvent } from '../../../events/comment-mention.event';
import {
  COMMENT_NOTIFICATION_PORT,
  ICommentNotificationPort,
} from '../../../ports/comment-notification.port';

/**
 * Notifies each newly mentioned user via the outbound notification port. Wording,
 * template key, and channels are owned by the host adapter — not here. When no
 * adapter is registered, mentions produce no notification.
 */
@EventsHandler(CommentMentionEvent)
@Injectable()
export class OnCommentMentionedHandler implements IEventHandler<CommentMentionEvent> {
  constructor(
    @Optional()
    @Inject(COMMENT_NOTIFICATION_PORT)
    private readonly notificationPort: ICommentNotificationPort | null,
  ) {}

  async handle(event: CommentMentionEvent): Promise<void> {
    if (!this.notificationPort) return;

    const { snapshot: comment, newMentions } = event;

    for (const mention of newMentions) {
      await this.notificationPort.notifyMention({
        commentId: comment.id,
        entityType: comment.entityType,
        entityId: comment.entityId,
        authorName: comment.authorName,
        mentionUserId: mention.userId,
        mentionEmail: mention.email,
        mentionDisplayName: mention.displayName,
      });
    }
  }
}
