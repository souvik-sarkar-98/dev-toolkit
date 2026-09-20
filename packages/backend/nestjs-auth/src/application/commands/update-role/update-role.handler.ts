import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateRoleCommand } from './update-role.command';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { RoleNotFoundError } from '../../../domain/errors/auth.errors';
import { RoleResponseMapper } from '../../mappers/role-response.mapper';
import { RoleResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(UpdateRoleCommand)
@Injectable()
export class UpdateRoleHandler implements ICommandHandler<UpdateRoleCommand, RoleResponseDto> {
  constructor(@Inject(IRoleRepository) private readonly repo: IRoleRepository) {}

  async execute(command: UpdateRoleCommand): Promise<RoleResponseDto> {
    const role = await this.repo.findWithPermissions(command.key);
    if (!role || role.isDeleted()) throw new RoleNotFoundError(command.key);
    role.updateDescription(command.description);
    const updated = await this.repo.update(role.id, role);
    updated.withPermissionKeys(role.permissionKeys);
    return RoleResponseMapper.toDto(updated);
  }
}
