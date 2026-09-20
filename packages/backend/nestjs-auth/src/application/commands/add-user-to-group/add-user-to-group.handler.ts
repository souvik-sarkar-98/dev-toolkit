import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { AddUserToGroupCommand } from './add-user-to-group.command';
import { UserRole } from '../../../domain/aggregates/user-role/user-role.aggregate';
import { UserRoleGroup } from '../../../domain/aggregates/user-role-group/user-role-group.aggregate';
import { IRoleGroupRepository } from '../../../domain/repositories/role-group.repository';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { IUserRoleGroupRepository } from '../../../domain/repositories/user-role-group.repository';
import { RoleGroupNotFoundError, RoleNotFoundError } from '../../../domain/errors/auth.errors';
import { UserRoleResponseMapper } from '../../mappers/user-role-response.mapper';
import { UserRoleGroupResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(AddUserToGroupCommand)
@Injectable()
export class AddUserToGroupHandler
  implements ICommandHandler<AddUserToGroupCommand, UserRoleGroupResponseDto>
{
  constructor(
    @Inject(IRoleGroupRepository) private readonly roleGroupRepo: IRoleGroupRepository,
    @Inject(IRoleRepository) private readonly roleRepo: IRoleRepository,
    @Inject(IUserRoleRepository) private readonly userRoleRepo: IUserRoleRepository,
    @Inject(IUserRoleGroupRepository) private readonly userRoleGroupRepo: IUserRoleGroupRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: AddUserToGroupCommand): Promise<UserRoleGroupResponseDto> {
    const group = await this.roleGroupRepo.findWithRoles(command.groupKey);
    if (!group) throw new RoleGroupNotFoundError(command.groupKey);

    const membership = UserRoleGroup.grant({
      idpSub: command.idpSub,
      groupId: group.id,
      ownerId: command.ownerId,
      entityId: command.entityId,
      entityType: command.entityType,
      grantedBy: command.grantedBy,
      note: command.note,
    });

    const userRoles: UserRole[] = [];
    for (const roleKey of group.roleKeys) {
      const role = await this.roleRepo.findByKey(roleKey);
      if (!role || role.isDeleted()) throw new RoleNotFoundError(roleKey);
      userRoles.push(
        UserRole.grant({
          idpSub: command.idpSub,
          roleId: role.id,
          ownerId: command.ownerId,
          entityId: command.entityId,
          entityType: command.entityType,
          sourceGroupId: group.id,
          grantedBy: command.grantedBy,
          note: command.note,
        }),
      );
    }

    // Persist membership and all derived user-roles atomically
    await this.userRoleGroupRepo.createMembershipWithRoles(membership, userRoles);

    // Emit domain events only after the transaction succeeds
    this.eventBus.publishAll([...membership.domainEvents]);
    membership.clearEvents();

    for (const ur of userRoles) {
      this.eventBus.publishAll([...ur.domainEvents]);
      ur.clearEvents();
    }

    return UserRoleResponseMapper.toGroupDto(membership);
  }
}
