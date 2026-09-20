import { Injectable } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CommentUpdatedEvent } from '../../../../domain/events/comment-updated.event';
import { CommentMentionEvent } from '../../../events/comment-mention.event';

/**
 * Reacts to CommentUpdatedEvent and emits CommentMentionEvent only for
 * mentions that are NEW in this update. Existing mentions are not re-notified.
 */
@EventsHandler(CommentUpdatedEvent)
@Injectable()
export class OnCommentUpdatedHandler implements IEventHandler<CommentUpdatedEvent> {
  constructor(private readonly eventBus: EventBus) {}

  handle(event: CommentUpdatedEvent): void {
    if (!event.newMentions.length) return;

    this.eventBus.publish(new CommentMentionEvent(event.snapshot, event.newMentions));
  }
}
