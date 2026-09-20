import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { RevokeUserRoleCommand } from './revoke-user-role.command';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { UserRoleNotFoundError } from '../../../domain/errors/auth.errors';
import { UserRoleResponseMapper } from '../../mappers/user-role-response.mapper';
import { UserRoleResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(RevokeUserRoleCommand)
@Injectable()
export class RevokeUserRoleHandler
  implements ICommandHandler<RevokeUserRoleCommand, UserRoleResponseDto>
{
  constructor(
    @Inject(IUserRoleRepository) private readonly userRoleRepo: IUserRoleRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RevokeUserRoleCommand): Promise<UserRoleResponseDto> {
    const userRole = await this.userRoleRepo.findById(command.userRoleId);
    // Treat ownership mismatch as not-found to prevent enumeration (IDOR guard)
    if (!userRole || userRole.idpSub !== command.idpSub) {
      throw new UserRoleNotFoundError(command.userRoleId);
    }

    userRole.revoke(command.revokedBy);
    await this.userRoleRepo.update(userRole.id, userRole);

    this.eventBus.publishAll([...userRole.domainEvents]);
    userRole.clearEvents();

    return UserRoleResponseMapper.toDto(userRole);
  }
}
