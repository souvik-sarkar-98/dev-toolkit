import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { DeletePermissionCommand } from './delete-permission.command';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { CatalogInUseError, PermissionNotFoundError } from '../../../domain/errors/auth.errors';

@CommandHandler(DeletePermissionCommand)
@Injectable()
export class DeletePermissionHandler
  implements ICommandHandler<DeletePermissionCommand, void>
{
  constructor(
    @Inject(IPermissionRepository) private readonly permissionRepo: IPermissionRepository,
    @Inject(IRoleRepository) private readonly roleRepo: IRoleRepository,
  ) {}

  async execute(command: DeletePermissionCommand): Promise<void> {
    const permission = await this.permissionRepo.findByKey(command.key);
    if (!permission || permission.isDeleted()) {
      throw new PermissionNotFoundError(command.key);
    }

    const linkedRoles = await this.roleRepo.countActiveByPermissionId(permission.id);
    if (linkedRoles > 0) {
      throw new CatalogInUseError(
        'permission',
        command.key,
        `it is assigned to ${linkedRoles} role(s)`,
      );
    }

    permission.softDelete();
    await this.permissionRepo.update(permission.id, permission);
  }
}
