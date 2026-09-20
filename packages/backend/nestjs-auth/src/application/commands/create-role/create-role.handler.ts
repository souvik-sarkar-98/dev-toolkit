import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { CreateRoleCommand } from './create-role.command';
import { Role } from '../../../domain/aggregates/role/role.aggregate';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { CatalogKeyConflictError } from '../../../domain/errors/auth.errors';
import { RoleResponseMapper } from '../../mappers/role-response.mapper';
import { RoleResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(CreateRoleCommand)
@Injectable()
export class CreateRoleHandler implements ICommandHandler<CreateRoleCommand, RoleResponseDto> {
  constructor(@Inject(IRoleRepository) private readonly repo: IRoleRepository) {}

  async execute(command: CreateRoleCommand): Promise<RoleResponseDto> {
    const existing = await this.repo.findByKey(command.key);
    if (existing && !existing.isDeleted()) {
      throw new CatalogKeyConflictError('Role', command.key);
    }

    if (existing?.isDeleted()) {
      existing.restore();
      existing.updateDescription(command.description);
      const restored = await this.repo.update(existing.id, existing);
      return RoleResponseMapper.toDto(restored);
    }

    const role = Role.create({ key: command.key, description: command.description });
    const created = await this.repo.create(role);
    return RoleResponseMapper.toDto(created);
  }
}
