import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateRoleGroupCommand } from './update-role-group.command';
import { IRoleGroupRepository } from '../../../domain/repositories/role-group.repository';
import { RoleGroupNotFoundError } from '../../../domain/errors/auth.errors';
import { RoleGroupResponseMapper } from '../../mappers/role-group-response.mapper';
import { RoleGroupResponseDto } from '../../dtos/response/role-group-response.dto';

@CommandHandler(UpdateRoleGroupCommand)
@Injectable()
export class UpdateRoleGroupHandler
  implements ICommandHandler<UpdateRoleGroupCommand, RoleGroupResponseDto>
{
  constructor(
    @Inject(IRoleGroupRepository) private readonly repo: IRoleGroupRepository,
  ) {}

  async execute(command: UpdateRoleGroupCommand): Promise<RoleGroupResponseDto> {
    const group = await this.repo.findWithRoles(command.key);
    if (!group || group.isDeleted()) throw new RoleGroupNotFoundError(command.key);
    group.updateDescription(command.description);
    const updated = await this.repo.update(group.id, group);
    updated.withRoleKeys(group.roleKeys);
    return RoleGroupResponseMapper.toDto(updated);
  }
}
