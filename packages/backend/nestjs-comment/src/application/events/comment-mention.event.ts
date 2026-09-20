import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { Comment } from '../../domain/aggregates/comment.aggregate';
import { MentionInput } from '../../domain/repositories/mention-input';

export type CommentMentionSnapshot = Pick<Comment, 'id' | 'authorName' | 'entityType' | 'entityId'>;

/**
 * Application-level event — emitted by AddCommentHandler / UpdateCommentHandler
 * when there are newly mentioned users. Lives in the application layer because
 * it is NOT emitted by the domain aggregate.
 *
 * Pure data carrier — no IDirectCorrespondenceTrigger or IResourceCorrespondenceTrigger.
 * OnCommentMentionedHandler owns correspondence dispatch.
 */
export class CommentMentionEvent extends DomainEvent<CommentMentionSnapshot> {
  constructor(
    snapshot: CommentMentionSnapshot,
    /** Only the newly mentioned users in this operation — already deduplicated. */
    public readonly newMentions: MentionInput[],
  ) {
    super(snapshot.id, snapshot);
  }
}
