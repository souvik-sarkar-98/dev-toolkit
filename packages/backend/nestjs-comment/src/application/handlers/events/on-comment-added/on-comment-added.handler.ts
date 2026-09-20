import { Injectable } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CommentAddedEvent } from '../../../../domain/events/comment-added.event';
import { CommentMentionEvent } from '../../../events/comment-mention.event';

/**
 * Reacts to CommentAddedEvent and emits CommentMentionEvent when the new
 * comment has at least one mention. Keeping this logic here (not in the
 * command handler) means the command handler stays a pure orchestrator —
 * it never constructs events itself.
 */
@EventsHandler(CommentAddedEvent)
@Injectable()
export class OnCommentAddedHandler implements IEventHandler<CommentAddedEvent> {
  constructor(private readonly eventBus: EventBus) {}

  handle(event: CommentAddedEvent): void {
    const { mentionItems } = event.snapshot;
    if (!mentionItems.length) return;

    this.eventBus.publish(
      new CommentMentionEvent(
        event.snapshot,
        mentionItems.map((m) => ({
          userId: m.mentionedUserId,
          displayName: m.displayName,
          email: m.email,
        })),
      ),
    );
  }
}
