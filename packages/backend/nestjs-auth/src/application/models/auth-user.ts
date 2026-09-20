import { UserInfo } from '@ssdev-toolkit/nestjs-core';

export interface RbacContext {
  permissions: string[];
  userRoles: string[];
  roleGroups: string[];
}

export interface ScopedRbacContext extends RbacContext {
  entityId: string;
  entityType: string;
}

export interface AuthUser extends RbacContext {
  type: 'apikey' | 'jwt';
  /** IdP subject identifier (JWT sub claim / synthetic for API keys). auth-internal — DO NOT use outside auth / token-vault. */
  idpSub: string;
  /** App profile UUID. Use this for audit fields, entity access, and all domain operations. Undefined when IUserLookupPort is not registered or the user has no profile yet. */
  userId?: string;
  /** Full user profile resolved at auth-time via IUserLookupPort. Undefined if port not registered. */
  userInfo?: UserInfo;
  /** Email — resolved from IdP JWT payload first, then falls back to userInfo.email. */
  email?: string;
  /** Display name — resolved from IdP JWT payload first, then falls back to userInfo.fullName. */
  name?: string;
  /** Raw JWT payload claims. Renamed from 'claims'. */
  idpClaims?: Record<string, unknown>;
  /** Entity-scoped access contexts */
  scopedAccess?: ScopedRbacContext[];
}
