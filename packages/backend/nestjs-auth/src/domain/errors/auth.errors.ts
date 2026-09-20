import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class ApiKeyNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`API key '${id}' not found.`, 'API_KEY_NOT_FOUND', 404);
  }
}

export class ApiKeyExpiredError extends BusinessError {
  constructor() {
    super('API key has expired.', 'API_KEY_EXPIRED', 401);
  }
}

export class InvalidApiKeyError extends BusinessError {
  constructor() {
    super('Invalid or expired API key.', 'INVALID_API_KEY', 401);
  }
}

export class InsufficientPermissionsError extends BusinessError {
  constructor() {
    super(
      'Cannot grant permissions that exceed your own access level.',
      'INSUFFICIENT_PERMISSIONS',
      403,
    );
  }
}

export class RoleNotFoundError extends BusinessError {
  constructor(key: string) {
    super(`Role '${key}' not found.`, 'ROLE_NOT_FOUND', 404);
  }
}

export class PermissionNotFoundError extends BusinessError {
  constructor(key: string) {
    super(`Permission '${key}' not found.`, 'PERMISSION_NOT_FOUND', 404);
  }
}

export class RoleGroupNotFoundError extends BusinessError {
  constructor(key: string) {
    super(`Role group '${key}' not found.`, 'ROLE_GROUP_NOT_FOUND', 404);
  }
}

export class CatalogKeyConflictError extends BusinessError {
  constructor(kind: string, key: string) {
    super(`${kind} '${key}' already exists.`, 'CATALOG_KEY_CONFLICT', 409);
  }
}

export class CatalogInUseError extends BusinessError {
  constructor(kind: string, key: string, reason: string) {
    super(`Cannot delete ${kind} '${key}': ${reason}.`, 'CATALOG_IN_USE', 409);
  }
}

export class UserRoleNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`User role assignment '${id}' not found.`, 'USER_ROLE_NOT_FOUND', 404);
  }
}

export class UserRoleGroupNotFoundError extends BusinessError {
  constructor(id: string) {
    super(
      `User role-group assignment '${id}' not found.`,
      'USER_ROLE_GROUP_NOT_FOUND',
      404,
    );
  }
}

export class UserRoleAlreadyRevokedError extends BusinessError {
  constructor(id: string) {
    super(
      `User role assignment '${id}' has already been revoked.`,
      'USER_ROLE_ALREADY_REVOKED',
      400,
    );
  }
}

export class UserPermissionNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`User permission grant '${id}' not found.`, 'USER_PERMISSION_NOT_FOUND', 404);
  }
}

export class UserPermissionAlreadyRevokedError extends BusinessError {
  constructor(id: string) {
    super(
      `User permission grant '${id}' has already been revoked.`,
      'USER_PERMISSION_ALREADY_REVOKED',
      400,
    );
  }
}

export class UserRoleGroupAlreadyRevokedError extends BusinessError {
  constructor(id: string) {
    super(
      `User role-group assignment '${id}' has already been revoked.`,
      'USER_ROLE_GROUP_ALREADY_REVOKED',
      400,
    );
  }
}
