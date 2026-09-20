// Services
export { RbacStateService } from './lib/services/rbac-state.service';
export type { RbacLoadState } from './lib/services/rbac-state.service';
export { AuthorizationService } from './lib/services/authorization.service';
export { UserIdentityService } from './lib/services/user-identity.service';
export { PlatformAuthService, LoginType } from './lib/services/platform-auth.service';

// Errors
export { RbacNotLoadedError } from './lib/errors/rbac-load.error';
export type { RbacLoadFailureReason } from './lib/errors/rbac-load.error';

// Directive
export { HasPermissionDirective } from './lib/directive/has-permission.directive';

// Guards
export {
  authGuard,
  noAuthGuard,
  permissionGuard,
  PermissionGuardOptions,
} from './lib/guards/auth.guard';

// Tokens
export { AUTH_CONFIG, AuthConfig } from './lib/tokens/auth-config.token';
export { RBAC_DATA_SOURCE, RbacDataSource } from './lib/tokens/rbac-data-source.token';
export { USER_IDENTITY, UserIdentityFacade } from './lib/tokens/user-identity.token';

// Utils
export { sanitizeInternalRedirectUrl } from './lib/utils/redirect-url.util';
