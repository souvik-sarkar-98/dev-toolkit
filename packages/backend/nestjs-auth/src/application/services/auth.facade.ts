import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IUserRolePort } from '../../domain/ports/user-role.port';
import { IUserLookupPort, UserInfo } from '@ssdev-toolkit/nestjs-core';
import { GrantUserRoleCommand } from '../commands/grant-user-role/grant-user-role.command';
import { RevokeUserRoleCommand } from '../commands/revoke-user-role/revoke-user-role.command';
import { ListUserRolesQuery } from '../queries/list-user-roles/list-user-roles.query';
import { UserRoleResponseDto } from '../dtos/response/auth-response.dtos';

/**
 * Programmatic entry point for auth role operations.
 * Consumers that do not go through HTTP inject this facade instead of coupling
 * to the HTTP controller or directly dispatching commands.
 *
 * IUserRolePort and IUserLookupPort are injected @Optional — getUsersByRole()
 * returns [] when either port is not registered.
 */
@Injectable()
export class AuthFacade {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Optional() @Inject(IUserRolePort) private readonly userRole: IUserRolePort | null,
    @Optional() @Inject(IUserLookupPort) private readonly userLookup: IUserLookupPort | null,
  ) { }

  /** List all active roles for a user identified by their IdP subject. */
  getUserRoles(idpSub: string): Promise<UserRoleResponseDto[]> {
    return this.queryBus.execute(new ListUserRolesQuery(idpSub));
  }

  /**
   * Grant a role to a user identified by their IdP subject.
   * @param grantedBy - caller's audit ID (prefer userId over idpSub)
   */
  grantRole(
    idpSub: string,
    roleKey: string,
    grantedBy: string,
    opts?: { ownerId?: string; note?: string; entityId?: string; entityType?: string },
  ): Promise<UserRoleResponseDto> {
    return this.commandBus.execute(
      new GrantUserRoleCommand(
        idpSub,
        roleKey,
        opts?.ownerId,
        grantedBy,
        opts?.note,
        opts?.entityId,
        opts?.entityType,
      ),
    );
  }

  /**
   * Revoke a role from a user identified by their IdP subject.
   * @param revokedBy - caller's audit ID (prefer userId over idpSub)
   */
  revokeRole(idpSub: string, roleId: string, revokedBy: string): Promise<UserRoleResponseDto> {
    return this.commandBus.execute(new RevokeUserRoleCommand(idpSub, roleId, revokedBy));
  }

  /**
   * Resolve all UserInfo records for members of a given role.
   * Returns [] when IUserRolePort or IUserLookupPort is not registered.
   */
  async getUsersByRole(roleName: string): Promise<UserInfo[]> {
    if (!this.userRole || !this.userLookup) return [];
    const idpSubs = await this.userRole.findIdPSubsByRole(roleName);
    if (!idpSubs.length) return [];
    return this.userLookup.findByIdPSubs(idpSubs);
  }
}
