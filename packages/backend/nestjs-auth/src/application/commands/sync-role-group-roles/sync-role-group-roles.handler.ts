import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { SyncRoleGroupRolesCommand } from './sync-role-group-roles.command';
import { UserRole } from '../../../domain/aggregates/user-role/user-role.aggregate';
import { IRoleGroupRepository } from '../../../domain/repositories/role-group.repository';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { IUserRoleGroupRepository } from '../../../domain/repositories/user-role-group.repository';
import { RoleGroupNotFoundError, RoleNotFoundError } from '../../../domain/errors/auth.errors';
import { RoleGroupResponseMapper } from '../../mappers/role-group-response.mapper';
import { RoleGroupResponseDto } from '../../dtos/response/role-group-response.dto';
import { IUserAccessPort } from '../../ports/user-access.port';

@CommandHandler(SyncRoleGroupRolesCommand)
@Injectable()
export class SyncRoleGroupRolesHandler
  implements ICommandHandler<SyncRoleGroupRolesCommand, RoleGroupResponseDto>
{
  constructor(
    @Inject(IRoleGroupRepository) private readonly roleGroupRepo: IRoleGroupRepository,
    @Inject(IRoleRepository) private readonly roleRepo: IRoleRepository,
    @Inject(IUserRoleRepository) private readonly userRoleRepo: IUserRoleRepository,
    @Inject(IUserRoleGroupRepository) private readonly userRoleGroupRepo: IUserRoleGroupRepository,
    @Inject(IUserAccessPort) private readonly userAccess: IUserAccessPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SyncRoleGroupRolesCommand): Promise<RoleGroupResponseDto> {
    const group = await this.roleGroupRepo.findByKey(command.key);
    if (!group || group.isDeleted()) throw new RoleGroupNotFoundError(command.key);

    const uniqueKeys = [...new Set(command.roleKeys)];
    const roles = await this.roleRepo.findByKeys(uniqueKeys);
    if (roles.length !== uniqueKeys.length) {
      const found = new Set(roles.map((r) => r.key));
      const missing = uniqueKeys.find((k) => !found.has(k))!;
      throw new RoleNotFoundError(missing);
    }

    await this.roleGroupRepo.syncRoles(
      group.id,
      roles.map((r) => r.id),
    );
    group.withRoleKeys(roles.map((r) => r.key));

    const memberships = await this.userRoleGroupRepo.findActiveByGroupId(group.id);
    const affectedSubs: string[] = [];

    for (const membership of memberships) {
      affectedSubs.push(membership.idpSub);
      await this.userRoleRepo.revokeSourcedRoles(
        membership.idpSub,
        group.id,
        command.grantedBy,
      );

      const derived: UserRole[] = roles.map((role) =>
        UserRole.grant({
          idpSub: membership.idpSub,
          roleId: role.id,
          ownerId: membership.ownerId,
          entityId: membership.entityId,
          entityType: membership.entityType,
          sourceGroupId: group.id,
          grantedBy: command.grantedBy,
          note: membership.note,
        }),
      );

      if (derived.length > 0) {
        await this.userRoleRepo.bulkCreate(derived);
        for (const ur of derived) {
          this.eventBus.publishAll([...ur.domainEvents]);
          ur.clearEvents();
        }
      }
    }

    await this.userAccess.invalidateMany(affectedSubs);
    return RoleGroupResponseMapper.toDto(group);
  }
}
