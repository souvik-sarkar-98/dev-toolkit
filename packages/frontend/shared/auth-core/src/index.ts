export { AuthUser } from './auth-user.model.js';
export {
  RbacAccessSnapshot,
  RbacScopedAccessSnapshot,
  RbacEntityContext,
  RbacUserAccessSnapshot,
  CurrentUserRbacDto,
  contextFrom,
  findScopedAccess,
  effectivePermissions,
  effectiveRoles,
  effectiveRoleGroups,
  snapshotFromCurrentUser,
} from './rbac-context.model.js';
export {
  RbacSession,
  RbacNotLoadedError,
  inspectWaitUntilLoaded,
} from './rbac-session.js';
export type { RbacLoadState, RbacLoadFailureReason } from './rbac-session.js';
export {
  decideAuthGuard,
  decideNoAuthGuard,
  decidePermissionGuard,
  applyAuthGuardDecision,
  loadRbacAfterLogin,
  sanitizeInternalRedirectUrl,
} from './auth-decisions.js';
export type {
  AuthGuardAction,
  AuthGuardDecision,
  NavigationExecutor,
  IdentityProvider,
  RbacLoader,
} from './auth-decisions.js';
