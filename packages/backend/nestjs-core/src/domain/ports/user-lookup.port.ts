/**
 * Represents an application user profile as returned by the host app's UserModule.
 * Used by all domain modules that need user display/contact data.
 * Contains no auth-internal concepts — idpSub is only populated when the lookup
 * was performed via findByIdPSub / findByIdPSubs.
 */
export interface UserInfo {
  id: string;
  idpSub?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phoneNo?: string;
  [key: string]: any
}

export const IUserLookupPort = Symbol('IUserLookupPort');

/**
 * Port for resolving application user profiles.
 *
 * Who implements: consuming app's UserAdapter (queries UserProfile table).
 *
 * Who consumes:
 *   - auth/UserAccessAdapter (@Optional) — populates AuthUser.userId and AuthUser.userInfo at JWT verification time
 *   - auth/AuthFacade (@Optional) — enriches role-member lists with full UserInfo
 *   - correspondence/SubscriptionResolutionService (@Optional) — resolves dispatch targets
 *
 * Caching note: this port carries no caching contract. The UserAccessAdapter call site
 * is already cached (AuthUser TTL). For dispatch-path calls, the consuming app's
 * UserAdapter may add its own short-TTL cache if profiling shows it is needed.
 *
 * Registration (in consuming app's UserModule):
 *   { provide: IUserLookupPort, useClass: UserAdapter }
 */
export interface IUserLookupPort {
  findById(id: string): Promise<UserInfo | null>;
  findByIds(ids: string[]): Promise<UserInfo[]>;
  findByIdPSub(idpSub: string): Promise<UserInfo | null>;
  findByIdPSubs(idpSubs: string[]): Promise<UserInfo[]>;
  findByEmail(email: string): Promise<UserInfo | null>;
}
