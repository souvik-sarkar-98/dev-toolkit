import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class DocumentNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`Document ${id} not found`, 'DOCUMENT_NOT_FOUND', 404);
  }
}

export class DocumentAccessDeniedError extends BusinessError {
  constructor(action: string, entityType: string, entityId?: string) {
    const location = entityId ? `${entityType}/${entityId}` : entityType;
    super(`No ${action} access to ${location}`, 'DOCUMENT_ACCESS_DENIED', 403);
  }
}

export class EntityTypeForbiddenError extends BusinessError {
  constructor(entityType: string) {
    super(
      `entityType "${entityType}" is not registered with DmsModule`,
      'DOCUMENT_ENTITY_TYPE_FORBIDDEN',
      403,
    );
  }
}

export class FileSizeExceededError extends BusinessError {
  constructor(maxMb: number) {
    super(
      `File size exceeds the maximum allowed size of ${maxMb} MB`,
      'FILE_SIZE_EXCEEDED',
      400,
    );
  }
}

export class MimeTypeNotAllowedError extends BusinessError {
  constructor(contentType: string) {
    super(
      `Content type "${contentType}" is not allowed`,
      'MIME_TYPE_NOT_ALLOWED',
      400,
    );
  }
}

export class DocumentLimitReachedError extends BusinessError {
  constructor(entityType: string, entityId: string, limit: number) {
    super(
      `Document limit of ${limit} reached for ${entityType}/${entityId}`,
      'DOCUMENT_LIMIT_REACHED',
      400,
    );
  }
}
