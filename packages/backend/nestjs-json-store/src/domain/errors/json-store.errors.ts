import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class JsonDocumentNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`JsonDocument "${id}" not found`, 'JSON_DOCUMENT_NOT_FOUND', 404);
  }
}

export class JsonDocumentKeyNotFoundError extends BusinessError {
  constructor(key: string, namespace: string) {
    super(
      `JsonDocument with key "${key}" in namespace "${namespace}" not found`,
      'JSON_DOCUMENT_KEY_NOT_FOUND',
      404,
    );
  }
}

export class JsonDocumentAlreadyExistsError extends BusinessError {
  constructor(key: string, namespace: string) {
    super(
      `JsonDocument with key "${key}" already exists in namespace "${namespace}"`,
      'JSON_DOCUMENT_ALREADY_EXISTS',
      409,
    );
  }
}

export class JsonDocumentInvalidError extends BusinessError {
  constructor(reason: string) {
    super(reason, 'JSON_DOCUMENT_INVALID', 400);
  }
}
