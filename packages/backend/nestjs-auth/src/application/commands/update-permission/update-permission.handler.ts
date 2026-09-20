import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UpdatePermissionCommand } from './update-permission.command';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository';
import { PermissionNotFoundError } from '../../../domain/errors/auth.errors';
import { PermissionResponseMapper } from '../../mappers/permission-response.mapper';
import { PermissionResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(UpdatePermissionCommand)
@Injectable()
export class UpdatePermissionHandler
  implements ICommandHandler<UpdatePermissionCommand, PermissionResponseDto>
{
  constructor(
    @Inject(IPermissionRepository) private readonly repo: IPermissionRepository,
  ) {}

  async execute(command: UpdatePermissionCommand): Promise<PermissionResponseDto> {
    const permission = await this.repo.findByKey(command.key);
    if (!permission || permission.isDeleted()) {
      throw new PermissionNotFoundError(command.key);
    }
    permission.updateDescription(command.description);
    const updated = await this.repo.update(permission.id, permission);
    return PermissionResponseMapper.toDto(updated);
  }
}
