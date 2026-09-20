import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { CommentMention } from '../entities/comment-mention.entity';
import { CommentAddedEvent, type CommentAddedSnapshot } from '../events/comment-added.event';
import { CommentUpdatedEvent, type CommentUpdatedSnapshot } from '../events/comment-updated.event';
import { CommentDeletedEvent, type CommentDeletedSnapshot } from '../events/comment-deleted.event';
import { MentionInput } from '../repositories/mention-input';
import { CommentInvalidError } from '../errors/comment.errors';

export class Comment extends AggregateRoot<string> {
  #content: string;
  #authorId: string;
  #authorName: string;
  #entityType: string;
  #entityId: string;
  #parentId?: string;
  #replies: Comment[];
  #mentionItems: CommentMention[];
  #deletedAt: Date | null;

  private constructor(
    id: string,
    content: string,
    authorId: string,
    authorName: string,
    entityType: string,
    entityId: string,
    parentId?: string,
    createdAt?: Date,
    updatedAt?: Date,
    replies?: Comment[],
    mentionItems?: CommentMention[],
    deletedAt?: Date | null,
  ) {
    super(id, createdAt, updatedAt);
    this.#content = content;
    this.#authorId = authorId;
    this.#authorName = authorName;
    this.#entityType = entityType;
    this.#entityId = entityId;
    this.#parentId = parentId;
    this.#replies = replies ?? [];
    this.#mentionItems = mentionItems ?? [];
    this.#deletedAt = deletedAt ?? null;
  }

  /**
   * Reconstitution path — used only by the infrastructure mapper (toDomain).
   * Does NOT raise domain events; the aggregate is being restored from storage.
   */
  static rehydrate(
    id: string,
    content: string,
    authorId: string,
    authorName: string,
    entityType: string,
    entityId: string,
    parentId?: string,
    createdAt?: Date,
    updatedAt?: Date,
    replies?: Comment[],
    mentionItems?: CommentMention[],
    deletedAt?: Date | null,
  ): Comment {
    return new Comment(
      id,
      content,
      authorId,
      authorName,
      entityType,
      entityId,
      parentId,
      createdAt,
      updatedAt,
      replies,
      mentionItems,
      deletedAt,
    );
  }

  /**
   * Factory — the only public way to create a new comment.
   * Raises CommentAddedEvent.
   *
   * Client-supplied mentions are validated server-side: only entries whose
   * userId appears as an @[userId] token in the content are kept, preventing
   * a malicious client from injecting arbitrary mention targets. Duplicates
   * are also removed.
   */
  static create(op: {
    content: string;
    authorId: string;
    authorName: string;
    entityType: string;
    entityId: string;
    mentions: MentionInput[];
    parentId?: string;
  }): Comment {
    if (!op.content?.trim()) throw new CommentInvalidError('Comment content must not be empty');
    if (!op.authorId?.trim()) throw new CommentInvalidError('authorId is required');
    if (!op.entityType?.trim()) throw new CommentInvalidError('entityType is required');
    if (!op.entityId?.trim()) throw new CommentInvalidError('entityId is required');

    const id = randomUUID();
    const mentionedIds = Comment.parseMentionedUserIds(op.content);
    const uniqueMentions = Comment.deduplicateMentions(
      op.mentions.filter((m) => mentionedIds.has(m.userId)),
    );
    const mentionItems = uniqueMentions.map(
      (m) => new CommentMention(id, m.userId, m.displayName, m.email),
    );
    const comment = new Comment(
      id,
      op.content,
      op.authorId,
      op.authorName,
      op.entityType,
      op.entityId,
      op.parentId,
      undefined,
      undefined,
      [],
      mentionItems,
    );
    comment.addDomainEvent(new CommentAddedEvent(comment.toSnapshot<CommentAddedSnapshot>()));
    return comment;
  }

  /**
   * Updates content and replaces the full mention list.
   * Client-supplied mentions are validated against @[userId] tokens in the
   * updated content (server-side) and deduplicated before storing.
   * Returns the newly-added mentions (existing ones excluded) so the handler
   * can emit CommentMentionEvent only for fresh @mentions.
   * Raises CommentUpdatedEvent.
   */
  update(
    content: string,
    mentions: MentionInput[],
  ): { updated: boolean; newMentions: MentionInput[] } {
    if (!content?.trim()) throw new CommentInvalidError('Comment content must not be empty');

    const mentionedIds = Comment.parseMentionedUserIds(content);
    const validatedMentions = Comment.deduplicateMentions(
      mentions.filter((m) => mentionedIds.has(m.userId)),
    );

    const existingIds = new Set(this.#mentionItems.map((m) => m.mentionedUserId));
    const newMentions = validatedMentions.filter((m) => !existingIds.has(m.userId));

    const contentChanged = this.#content !== content;
    let mentionsChanged =
      validatedMentions.length !== this.#mentionItems.length || newMentions.length > 0;

    if (!mentionsChanged) {
      for (const incoming of validatedMentions) {
        const existing = this.#mentionItems.find((m) => m.mentionedUserId === incoming.userId);
        if (
          existing &&
          (existing.displayName !== incoming.displayName || existing.email !== incoming.email)
        ) {
          mentionsChanged = true;
          break;
        }
      }
    }

    if (!contentChanged && !mentionsChanged) {
      return { updated: false, newMentions: [] };
    }

    this.#content = content;
    this.#mentionItems = validatedMentions.map(
      (m) => new CommentMention(this.id, m.userId, m.displayName, m.email),
    );
    this.touch();
    this.addDomainEvent(new CommentUpdatedEvent(this.toSnapshot<CommentUpdatedSnapshot>(), newMentions));
    return { updated: true, newMentions };
  }

  /**
   * Marks this comment as soft-deleted and raises CommentDeletedEvent.
   * Sets the in-memory deletedAt so callers observe a consistent state.
   * The repository performs the recursive CTE update on the DB side.
   */
  softDelete(): void {
    this.#deletedAt = new Date();
    this.touch();
    this.addDomainEvent(new CommentDeletedEvent(this.toSnapshot<CommentDeletedSnapshot>()));
  }

  setReplies(replies: Comment[]): void {
    this.#replies = replies;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Parses @[userId] tokens from content. Used to validate that client-supplied
   * mentions actually appear in the text, preventing mention-injection attacks.
   */
  private static parseMentionedUserIds(content: string): Set<string> {
    const ids = new Set<string>();
    const regex = /@\[([^\]]+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      ids.add(match[1]);
    }
    return ids;
  }

  /** Deduplicates a MentionInput array by userId (last entry wins). */
  private static deduplicateMentions(mentions: MentionInput[]): MentionInput[] {
    return [...new Map(mentions.map((m) => [m.userId, m])).values()];
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get content(): string {
    return this.#content;
  }

  get authorId(): string {
    return this.#authorId;
  }

  get authorName(): string {
    return this.#authorName;
  }

  get entityType(): string {
    return this.#entityType;
  }

  get entityId(): string {
    return this.#entityId;
  }

  get parentId(): string | undefined {
    return this.#parentId;
  }

  get replies(): Comment[] {
    return [...this.#replies];
  }

  get mentionItems(): CommentMention[] {
    return [...this.#mentionItems];
  }

  get deletedAt(): Date | null {
    return this.#deletedAt;
  }
}
