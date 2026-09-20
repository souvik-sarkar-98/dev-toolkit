import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { CreateRoleGroupCommand } from './create-role-group.command';
import { RoleGroup } from '../../../domain/aggregates/role-group/role-group.aggregate';
import { IRoleGroupRepository } from '../../../domain/repositories/role-group.repository';
import { CatalogKeyConflictError } from '../../../domain/errors/auth.errors';
import { RoleGroupResponseMapper } from '../../mappers/role-group-response.mapper';
import { RoleGroupResponseDto } from '../../dtos/response/role-group-response.dto';

@CommandHandler(CreateRoleGroupCommand)
@Injectable()
export class CreateRoleGroupHandler
  implements ICommandHandler<CreateRoleGroupCommand, RoleGroupResponseDto>
{
  constructor(
    @Inject(IRoleGroupRepository) private readonly repo: IRoleGroupRepository,
  ) {}

  async execute(command: CreateRoleGroupCommand): Promise<RoleGroupResponseDto> {
    const existing = await this.repo.findByKey(command.key);
    if (existing && !existing.isDeleted()) {
      throw new CatalogKeyConflictError('Role group', command.key);
    }

    if (existing?.isDeleted()) {
      existing.restore();
      existing.updateDescription(command.description);
      const restored = await this.repo.update(existing.id, existing);
      return RoleGroupResponseMapper.toDto(restored);
    }

    const group = RoleGroup.create({
      key: command.key,
      description: command.description,
    });
    const created = await this.repo.create(group);
    return RoleGroupResponseMapper.toDto(created);
  }
}
