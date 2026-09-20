import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { DeleteRoleCommand } from './delete-role.command';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { IRoleGroupRepository } from '../../../domain/repositories/role-group.repository';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { IUserRoleGroupRepository } from '../../../domain/repositories/user-role-group.repository';
import { CatalogInUseError, RoleNotFoundError } from '../../../domain/errors/auth.errors';
import { IUserAccessPort } from '../../ports/user-access.port';

@CommandHandler(DeleteRoleCommand)
@Injectable()
export class DeleteRoleHandler implements ICommandHandler<DeleteRoleCommand, void> {
  constructor(
    @Inject(IRoleRepository) private readonly roleRepo: IRoleRepository,
    @Inject(IRoleGroupRepository) private readonly roleGroupRepo: IRoleGroupRepository,
    @Inject(IUserRoleRepository) private readonly userRoleRepo: IUserRoleRepository,
    @Inject(IUserRoleGroupRepository) private readonly userRoleGroupRepo: IUserRoleGroupRepository,
    @Inject(IUserAccessPort) private readonly userAccess: IUserAccessPort,
  ) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const role = await this.roleRepo.findByKey(command.key);
    if (!role || role.isDeleted()) throw new RoleNotFoundError(command.key);

    const [directHolders, groupHolders, groupLinks] = await Promise.all([
      this.userRoleRepo.findIdPSubsByRoleKey(command.key),
      this.userRoleGroupRepo.findIdPSubsByRoleKey(command.key),
      this.roleGroupRepo.countActiveByRoleId(role.id),
    ]);

    if (directHolders.length > 0 || groupHolders.length > 0) {
      throw new CatalogInUseError(
        'role',
        command.key,
        'it is still assigned to one or more users',
      );
    }
    if (groupLinks > 0) {
      throw new CatalogInUseError(
        'role',
        command.key,
        `it belongs to ${groupLinks} role group(s)`,
      );
    }

    role.softDelete();
    await this.roleRepo.update(role.id, role);
    await this.userAccess.invalidateMany([...directHolders, ...groupHolders]);
  }
}
