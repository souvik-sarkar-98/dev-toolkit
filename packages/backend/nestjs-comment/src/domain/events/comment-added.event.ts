import { DomainEvent } from '@ssdev-toolkit/nestjs-core';

export type CommentMentionItem = {
  readonly mentionedUserId: string;
  readonly displayName: string;
  readonly email: string;
};

export type CommentAddedSnapshot = {
  readonly id: string;
  readonly content: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly mentionItems: readonly CommentMentionItem[];
};

/** Emitted by Comment.create(). */
export class CommentAddedEvent extends DomainEvent<CommentAddedSnapshot> {
  constructor(snapshot: CommentAddedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
