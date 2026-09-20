import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { DeleteRoleGroupCommand } from './delete-role-group.command';
import { IRoleGroupRepository } from '../../../domain/repositories/role-group.repository';
import { IUserRoleGroupRepository } from '../../../domain/repositories/user-role-group.repository';
import { CatalogInUseError, RoleGroupNotFoundError } from '../../../domain/errors/auth.errors';
import { IUserAccessPort } from '../../ports/user-access.port';

@CommandHandler(DeleteRoleGroupCommand)
@Injectable()
export class DeleteRoleGroupHandler
  implements ICommandHandler<DeleteRoleGroupCommand, void>
{
  constructor(
    @Inject(IRoleGroupRepository) private readonly roleGroupRepo: IRoleGroupRepository,
    @Inject(IUserRoleGroupRepository) private readonly userRoleGroupRepo: IUserRoleGroupRepository,
    @Inject(IUserAccessPort) private readonly userAccess: IUserAccessPort,
  ) {}

  async execute(command: DeleteRoleGroupCommand): Promise<void> {
    const group = await this.roleGroupRepo.findByKey(command.key);
    if (!group || group.isDeleted()) throw new RoleGroupNotFoundError(command.key);

    const members = await this.userRoleGroupRepo.findIdPSubsByGroupId(group.id);
    if (members.length > 0) {
      throw new CatalogInUseError(
        'role group',
        command.key,
        'it still has active user memberships',
      );
    }

    group.softDelete();
    await this.roleGroupRepo.update(group.id, group);
    await this.userAccess.invalidateMany(members);
  }
}
