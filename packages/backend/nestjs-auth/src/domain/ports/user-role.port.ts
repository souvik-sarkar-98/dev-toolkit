/**
 * Port for querying role membership by IdP subject.
 *
 * Implemented by auth's own UserRoleAdapter (infrastructure layer).
 * The consuming app does NOT implement this — it is registered and exported by AuthModule.
 *
 * Returns idpSub[] (NOT userId[]).
 * The caller (correspondence, AuthFacade) is responsible for translating
 * idpSubs → UserInfo via IUserLookupPort.findByIdPSubs().
 *
 * Who consumes: correspondence/SubscriptionResolutionService, auth/AuthFacade
 */
export const IUserRolePort = Symbol('IUserRolePort');

export interface IUserRolePort {
  /** Returns IdP subjects (idpSubs) of all active members of the given role, from both direct assignments and group memberships. */
  findIdPSubsByRole(roleName: string): Promise<string[]>;
}
