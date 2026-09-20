// Module
export { CommentModule } from './comment.module';
export type { CommentModuleOverrides } from './comment.module';
export { CommentModuleOptions, EntityTypeAccessConfig as CommentEntityTypeAccessConfig } from './comment.schema';

// Application — outbound notification port (host provides the adapter)
export {
  COMMENT_NOTIFICATION_PORT,
  type ICommentNotificationPort,
  type CommentMentionNotification,
  type CommentAddedNotification,
} from './application/ports/comment-notification.port';

// Domain — errors
export {
  CommentNotFoundError,
  CommentAccessDeniedError,
  CommentEntityTypeForbiddenError,
  CommentOwnershipError,
  CommentParentMismatchError,
} from './domain/errors/comment.errors';

// Domain — events (pure data carriers emitted by the aggregate)
export { CommentAddedEvent } from './domain/events/comment-added.event';
export { CommentUpdatedEvent } from './domain/events/comment-updated.event';
export { CommentDeletedEvent } from './domain/events/comment-deleted.event';

// Application — events (emitted by handlers, NOT by the aggregate)
export { CommentMentionEvent } from './application/events/comment-mention.event';

// Domain — aggregates and entities (needed by persistence adapters)
export { Comment } from './domain/aggregates/comment.aggregate';
export { CommentMention } from './domain/entities/comment-mention.entity';

// Domain — ports and repository
// **Host persistence only** for ICommentRepository — integrate via CommentModule HTTP or future CommentFacade.
export { ICommentEntityAccessPort } from './domain/ports/entity-access.port';
export {
  ICommentRepository,
  CommentFilter,
} from './domain/repositories/comment.repository';
export { MentionInput } from './domain/repositories/mention-input';

// Domain — entity type config (exported so consumers can type allowedEntityTypes)
export type { EntityTypeConfig } from './comment.schema';

// Application — DTOs
export {
  CreateCommentDto,
  UpdateCommentDto,
  MentionDto,
  GetCommentsQueryDto,
  GetCommentsResponseDto,
  CommentResponseDto,
  CommentMentionResponseDto,
} from './application/dtos/comment.dtos';

// Infrastructure — options token (needed when consumers inject COMMENT_OPTIONS)
export { COMMENT_OPTIONS } from './infrastructure/comment-options.token';
