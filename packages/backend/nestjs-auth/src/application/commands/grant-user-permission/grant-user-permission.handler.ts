import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GrantUserPermissionCommand } from './grant-user-permission.command';
import { UserPermission } from '../../../domain/aggregates/user-permission/user-permission.aggregate';
import { IUserPermissionRepository } from '../../../domain/repositories/user-permission.repository';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository';
import { PermissionNotFoundError } from '../../../domain/errors/auth.errors';
import { UserPermissionResponseMapper } from '../../mappers/user-permission-response.mapper';
import { UserPermissionResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(GrantUserPermissionCommand)
@Injectable()
export class GrantUserPermissionHandler
  implements ICommandHandler<GrantUserPermissionCommand, UserPermissionResponseDto>
{
  constructor(
    @Inject(IUserPermissionRepository) private readonly userPermissionRepo: IUserPermissionRepository,
    @Inject(IPermissionRepository) private readonly permissionRepo: IPermissionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: GrantUserPermissionCommand): Promise<UserPermissionResponseDto> {
    const permission = await this.permissionRepo.findByKey(command.permissionKey);
    if (!permission || permission.isDeleted()) {
      throw new PermissionNotFoundError(command.permissionKey);
    }

    const grant = UserPermission.grant({
      idpSub: command.idpSub,
      permissionId: permission.id,
      ownerId: command.ownerId,
      entityId: command.entityId,
      entityType: command.entityType,
      grantedBy: command.grantedBy,
      note: command.note,
    });

    await this.userPermissionRepo.create(grant);

    this.eventBus.publishAll([...grant.domainEvents]);
    grant.clearEvents();

    return UserPermissionResponseMapper.toDto(
      new UserPermission({
        id: grant.id,
        idpSub: grant.idpSub,
        ownerId: grant.ownerId,
        entityId: grant.entityId,
        entityType: grant.entityType,
        permissionId: grant.permissionId,
        permissionKey: permission.key,
        grantedAt: grant.grantedAt,
        grantedBy: grant.grantedBy,
        note: grant.note,
      }),
    );
  }
}
