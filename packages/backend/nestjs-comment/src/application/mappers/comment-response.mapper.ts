import { Comment } from '../../domain/aggregates/comment.aggregate';
import { CommentMentionResponseDto, CommentResponseDto } from '../dtos/comment.dtos';

export class CommentResponseMapper {
  static toDto(comment: Comment): CommentResponseDto {
    const mentions: CommentMentionResponseDto[] = comment.mentionItems.map((m) => ({
      userId: m.mentionedUserId,
      displayName: m.displayName,
    }));

    return {
      id: comment.id,
      content: comment.content,
      authorId: comment.authorId,
      authorName: comment.authorName,
      entityType: comment.entityType,
      entityId: comment.entityId,
      parentId: comment.parentId,
      replies: comment.replies.map((r) => CommentResponseMapper.toDto(r)),
      mentions,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
