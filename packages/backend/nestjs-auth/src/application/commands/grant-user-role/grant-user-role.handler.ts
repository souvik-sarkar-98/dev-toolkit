import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GrantUserRoleCommand } from './grant-user-role.command';
import { UserRole } from '../../../domain/aggregates/user-role/user-role.aggregate';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { RoleNotFoundError } from '../../../domain/errors/auth.errors';
import { UserRoleResponseMapper } from '../../mappers/user-role-response.mapper';
import { UserRoleResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(GrantUserRoleCommand)
@Injectable()
export class GrantUserRoleHandler
  implements ICommandHandler<GrantUserRoleCommand, UserRoleResponseDto>
{
  constructor(
    @Inject(IUserRoleRepository) private readonly userRoleRepo: IUserRoleRepository,
    @Inject(IRoleRepository) private readonly roleRepo: IRoleRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: GrantUserRoleCommand): Promise<UserRoleResponseDto> {
    const role = await this.roleRepo.findByKey(command.roleKey);
    if (!role || role.isDeleted()) throw new RoleNotFoundError(command.roleKey);

    const userRole = UserRole.grant({
      idpSub: command.idpSub,
      roleId: role.id,
      ownerId: command.ownerId,
      entityId: command.entityId,
      entityType: command.entityType,
      grantedBy: command.grantedBy,
      note: command.note,
    });

    await this.userRoleRepo.create(userRole);

    this.eventBus.publishAll([...userRole.domainEvents]);
    userRole.clearEvents();

    return UserRoleResponseMapper.toDto(userRole);
  }
}
