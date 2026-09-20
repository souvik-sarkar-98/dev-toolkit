import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { Comment } from '../aggregates/comment.aggregate';
import { MentionInput } from './mention-input';

export interface CommentFilter {
  entityType?: string;
  entityId?: string;
}

/**
 * Token naming rule: Symbol name = interface name — one import serves as both
 * the @Inject() token and the TypeScript type annotation.
 */
export const ICommentRepository = Symbol('ICommentRepository');

/**
 * Standard CRUD methods (findById, create, update, delete, findAll, findPaged,
 * count) are inherited from IRepository. Only comment-specific methods are added.
 */
export interface ICommentRepository extends IRepository<Comment, string, CommentFilter> {
  /**
   * Returns root comments (parentId = null) paginated, with their reply trees
   * assembled in-memory. limit/offset apply to root comments only.
   * Also returns the total count of root comments for pagination metadata.
   */
  findByEntity(
    entityType: string,
    entityId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ comments: Comment[]; total: number }>;

  /**
   * Atomic full-replace: deletes all existing mentions for the comment then
   * inserts the new list in a single transaction.
   * Used for both initial save (after create) and on update (replace-on-edit).
   */
  syncMentions(commentId: string, mentions: MentionInput[]): Promise<void>;
}
