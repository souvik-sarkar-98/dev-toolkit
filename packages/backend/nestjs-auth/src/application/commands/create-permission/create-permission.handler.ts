import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { CreatePermissionCommand } from './create-permission.command';
import { Permission } from '../../../domain/aggregates/permission/permission.aggregate';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository';
import { CatalogKeyConflictError } from '../../../domain/errors/auth.errors';
import { PermissionResponseMapper } from '../../mappers/permission-response.mapper';
import { PermissionResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(CreatePermissionCommand)
@Injectable()
export class CreatePermissionHandler
  implements ICommandHandler<CreatePermissionCommand, PermissionResponseDto>
{
  constructor(
    @Inject(IPermissionRepository) private readonly repo: IPermissionRepository,
  ) {}

  async execute(command: CreatePermissionCommand): Promise<PermissionResponseDto> {
    const existing = await this.repo.findByKey(command.key);
    if (existing && !existing.isDeleted()) {
      throw new CatalogKeyConflictError('Permission', command.key);
    }

    if (existing?.isDeleted()) {
      existing.restore();
      existing.updateDescription(command.description);
      const restored = await this.repo.update(existing.id, existing);
      return PermissionResponseMapper.toDto(restored);
    }

    const permission = Permission.create({
      key: command.key,
      description: command.description,
    });
    const created = await this.repo.create(permission);
    return PermissionResponseMapper.toDto(created);
  }
}
