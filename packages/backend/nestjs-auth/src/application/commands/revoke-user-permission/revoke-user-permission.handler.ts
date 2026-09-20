import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { RevokeUserPermissionCommand } from './revoke-user-permission.command';
import { IUserPermissionRepository } from '../../../domain/repositories/user-permission.repository';
import { UserPermissionNotFoundError } from '../../../domain/errors/auth.errors';
import { UserPermissionResponseMapper } from '../../mappers/user-permission-response.mapper';
import { UserPermissionResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(RevokeUserPermissionCommand)
@Injectable()
export class RevokeUserPermissionHandler
  implements ICommandHandler<RevokeUserPermissionCommand, UserPermissionResponseDto>
{
  constructor(
    @Inject(IUserPermissionRepository) private readonly userPermissionRepo: IUserPermissionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RevokeUserPermissionCommand): Promise<UserPermissionResponseDto> {
    const grant = await this.userPermissionRepo.findById(command.userPermissionId);
    if (!grant || grant.idpSub !== command.idpSub) {
      throw new UserPermissionNotFoundError(command.userPermissionId);
    }

    grant.revoke(command.revokedBy);
    await this.userPermissionRepo.update(grant.id, grant);

    this.eventBus.publishAll([...grant.domainEvents]);
    grant.clearEvents();

    return UserPermissionResponseMapper.toDto(grant);
  }
}
