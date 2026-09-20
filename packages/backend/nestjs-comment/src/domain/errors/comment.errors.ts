import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class CommentNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`Comment ${id} not found`, 'COMMENT_NOT_FOUND', 404);
  }
}

export class CommentAccessDeniedError extends BusinessError {
  constructor(action: string, entityType: string, entityId?: string) {
    const location = entityId ? `${entityType}/${entityId}` : entityType;
    super(`No ${action} access to ${location}`, 'COMMENT_ACCESS_DENIED', 403);
  }
}

export class CommentEntityTypeForbiddenError extends BusinessError {
  constructor(entityType: string) {
    super(
      `entityType "${entityType}" is not registered with CommentModule`,
      'COMMENT_ENTITY_TYPE_FORBIDDEN',
      403,
    );
  }
}

export class CommentOwnershipError extends BusinessError {
  constructor() {
    super('You are not the author of this comment', 'COMMENT_NOT_AUTHOR', 403);
  }
}

export class CommentParentMismatchError extends BusinessError {
  constructor() {
    super(
      'Parent comment belongs to a different entity',
      'COMMENT_PARENT_MISMATCH',
      400,
    );
  }
}

export class CommentInvalidError extends BusinessError {
  constructor(reason: string) {
    super(reason, 'COMMENT_INVALID', 400);
  }
}
