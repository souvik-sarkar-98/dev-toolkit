import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { RemoveUserFromGroupCommand } from './remove-user-from-group.command';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { IUserRoleGroupRepository } from '../../../domain/repositories/user-role-group.repository';
import { UserRoleGroupNotFoundError } from '../../../domain/errors/auth.errors';
import { UserRoleResponseMapper } from '../../mappers/user-role-response.mapper';
import { UserRoleGroupResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(RemoveUserFromGroupCommand)
@Injectable()
export class RemoveUserFromGroupHandler
  implements ICommandHandler<RemoveUserFromGroupCommand, UserRoleGroupResponseDto>
{
  constructor(
    @Inject(IUserRoleGroupRepository) private readonly userRoleGroupRepo: IUserRoleGroupRepository,
    @Inject(IUserRoleRepository) private readonly userRoleRepo: IUserRoleRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RemoveUserFromGroupCommand): Promise<UserRoleGroupResponseDto> {
    const membership = await this.userRoleGroupRepo.findById(command.membershipId);
    // Treat ownership mismatch as not-found to prevent enumeration (IDOR guard)
    if (!membership || membership.idpSub !== command.idpSub) {
      throw new UserRoleGroupNotFoundError(command.membershipId);
    }

    membership.revoke(command.revokedBy);
    await this.userRoleGroupRepo.update(membership.id, membership);
    this.eventBus.publishAll([...membership.domainEvents]);
    membership.clearEvents();

    // Load each sourced role individually so domain events are fired per role
    // and revokedBy is properly recorded (avoids silent raw updateMany bypass)
    const sourcedRoles = await this.userRoleRepo.findAll({
      idpSub: command.idpSub,
      isActive: true,
      sourceGroupId: membership.groupId,
    });

    for (const role of sourcedRoles) {
      role.revoke(command.revokedBy);
      await this.userRoleRepo.update(role.id, role);
      this.eventBus.publishAll([...role.domainEvents]);
      role.clearEvents();
    }

    return UserRoleResponseMapper.toGroupDto(membership);
  }
}
