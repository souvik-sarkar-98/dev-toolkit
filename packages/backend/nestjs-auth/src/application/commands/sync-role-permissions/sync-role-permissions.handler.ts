import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { SyncRolePermissionsCommand } from './sync-role-permissions.command';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { IUserRoleGroupRepository } from '../../../domain/repositories/user-role-group.repository';
import { PermissionNotFoundError, RoleNotFoundError } from '../../../domain/errors/auth.errors';
import { RoleResponseMapper } from '../../mappers/role-response.mapper';
import { RoleResponseDto } from '../../dtos/response/auth-response.dtos';
import { IUserAccessPort } from '../../ports/user-access.port';

@CommandHandler(SyncRolePermissionsCommand)
@Injectable()
export class SyncRolePermissionsHandler
  implements ICommandHandler<SyncRolePermissionsCommand, RoleResponseDto>
{
  constructor(
    @Inject(IRoleRepository) private readonly roleRepo: IRoleRepository,
    @Inject(IPermissionRepository) private readonly permissionRepo: IPermissionRepository,
    @Inject(IUserRoleRepository) private readonly userRoleRepo: IUserRoleRepository,
    @Inject(IUserRoleGroupRepository) private readonly userRoleGroupRepo: IUserRoleGroupRepository,
    @Inject(IUserAccessPort) private readonly userAccess: IUserAccessPort,
  ) {}

  async execute(command: SyncRolePermissionsCommand): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findByKey(command.key);
    if (!role || role.isDeleted()) throw new RoleNotFoundError(command.key);

    const uniqueKeys = [...new Set(command.permissionKeys)];
    const permissions = await this.permissionRepo.findByKeys(uniqueKeys);
    if (permissions.length !== uniqueKeys.length) {
      const found = new Set(permissions.map((p) => p.key));
      const missing = uniqueKeys.find((k) => !found.has(k))!;
      throw new PermissionNotFoundError(missing);
    }

    await this.roleRepo.syncPermissions(
      role.id,
      permissions.map((p) => p.id),
    );
    role.withPermissionKeys(permissions.map((p) => p.key));

    const [direct, viaGroup] = await Promise.all([
      this.userRoleRepo.findIdPSubsByRoleKey(command.key),
      this.userRoleGroupRepo.findIdPSubsByRoleKey(command.key),
    ]);
    await this.userAccess.invalidateMany([...direct, ...viaGroup]);

    return RoleResponseMapper.toDto(role);
  }
}
