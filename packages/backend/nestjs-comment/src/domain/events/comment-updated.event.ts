import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { Comment } from '../aggregates/comment.aggregate';
import { MentionInput } from '../repositories/mention-input';

export type CommentUpdatedSnapshot = Pick<Comment, 'id' | 'content' | 'authorId' | 'authorName' | 'entityType' | 'entityId'>;

/** Emitted by Comment.update(). Carries only the newly added mentions so handlers skip re-notifying existing ones. */
export class CommentUpdatedEvent extends DomainEvent<CommentUpdatedSnapshot> {
  constructor(
    snapshot: CommentUpdatedSnapshot,
    public readonly newMentions: MentionInput[],
  ) {
    super(snapshot.id, snapshot);
  }
}
