import { BaseDomain } from '@ssdev-toolkit/nestjs-core';

export type CommentMentionId = { commentId: string; mentionedUserId: string };

/**
 * Child entity — persisted to comment_mention with a composite primary key.
 * Always managed through the Comment aggregate root; no independent repository.
 * displayName and email are stored at write time from client-provided MentionDto
 * so no UserProfile join is needed at read time.
 */
export class CommentMention extends BaseDomain<CommentMentionId> {
  #displayName: string;
  #email: string;

  constructor(
    commentId: string,
    mentionedUserId: string,
    displayName: string,
    email: string,
    createdAt?: Date,
  ) {
    super({ commentId, mentionedUserId }, createdAt, createdAt);
    this.#displayName = displayName;
    this.#email = email;
  }

  get commentId(): string {
    return this.id.commentId;
  }

  get mentionedUserId(): string {
    return this.id.mentionedUserId;
  }

  get displayName(): string {
    return this.#displayName;
  }

  get email(): string {
    return this.#email;
  }
}
