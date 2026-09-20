import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ICACHE_PORT, ICachePort, IUserLookupPort, UserInfo } from '@ssdev-toolkit/nestjs-core';
import { IUserAccessPort } from '../../application/ports/user-access.port';
import { AuthUser, ScopedRbacContext } from '../../application/models/auth-user';
import { AUTH_OPTIONS } from '../auth-options.token';
import { AuthModuleOptions } from '../../auth-options';
import { IUserRoleRepository } from '../../domain/repositories/user-role.repository';
import { IUserRoleGroupRepository } from '../../domain/repositories/user-role-group.repository';
import { IUserPermissionRepository } from '../../domain/repositories/user-permission.repository';

@Injectable()
export class UserAccessAdapter implements IUserAccessPort {
  private readonly logger = new Logger(UserAccessAdapter.name);
  constructor(
    @Inject(IUserRoleRepository) private readonly userRoleRepo: IUserRoleRepository,
    @Inject(IUserRoleGroupRepository) private readonly userRoleGroupRepo: IUserRoleGroupRepository,
    @Inject(IUserPermissionRepository)
    private readonly userPermissionRepo: IUserPermissionRepository,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
    @Inject(ICACHE_PORT) private readonly cache: ICachePort,
    @Optional() @Inject(IUserLookupPort) private readonly userLookup: IUserLookupPort | null,
  ) { }

  private cacheKey(idpSub: string): string {
    return `user-access:${idpSub}`;
  }

  async resolve(idpSub: string): Promise<AuthUser> {
    const ttl = this.options.cache?.userAccessTtlMs ?? 1_800_000;
    return this.cache.getOrSet(this.cacheKey(idpSub), () => this.resolveFromDb(idpSub), ttl);
  }

  async invalidate(idpSub: string): Promise<void> {
    await this.cache.del(this.cacheKey(idpSub));
  }

  async invalidateMany(idpSubs: string[]): Promise<void> {
    const unique = [...new Set(idpSubs.filter(Boolean))];
    await Promise.all(unique.map((idpSub) => this.invalidate(idpSub)));
  }

  private async resolveFromDb(idpSub: string): Promise<AuthUser> {
    const [directRoles, groupMemberships, directPermissions] = await Promise.all([
      this.userRoleRepo.resolveDirectPermissions(idpSub),
      this.userRoleGroupRepo.resolveGroupPermissions(idpSub),
      this.userPermissionRepo.resolveDirectUserPermissions(idpSub),
    ]);

    if (!this.userLookup) {
      this.logger.warn('UserLookupPort not found, user details may not be available');
    }

    let userInfo: UserInfo | null = null;
    if (this.userLookup) {
      userInfo = await this.userLookup.findByIdPSub(idpSub);
    }

    this.logger.debug(
      `Resolved profile for ${idpSub}: ${userInfo ? `id=${userInfo.id}` : 'none'}`,
    );

    const permissionSet = new Set<string>();
    const roleSet = new Set<string>();
    const groupSet = new Set<string>();
    const scopedAccessByKey: Record<string, ScopedRbacContext> = {};
    const scopeKey = (entityId: string, entityType: string) => `${entityType}:${entityId}`;
    const ensureScoped = (entityId: string, entityType: string): ScopedRbacContext => {
      const key = scopeKey(entityId, entityType);
      scopedAccessByKey[key] ??= {
        entityId,
        entityType,
        permissions: [],
        userRoles: [],
        roleGroups: [],
      };
      return scopedAccessByKey[key];
    };

    for (const view of directRoles) {
      if (view.entityId && view.entityType) {
        const scoped = ensureScoped(view.entityId, view.entityType);
        if (!scoped.userRoles.includes(view.roleKey)) scoped.userRoles.push(view.roleKey);
        view.permissionKeys.forEach((k) => {
          if (!scoped.permissions.includes(k)) scoped.permissions.push(k);
        });
      } else {
        roleSet.add(view.roleKey);
        view.permissionKeys.forEach((k) => permissionSet.add(k));
      }
    }

    for (const view of groupMemberships) {
      if (view.entityId && view.entityType) {
        const scoped = ensureScoped(view.entityId, view.entityType);
        if (!scoped.roleGroups.includes(view.groupKey)) {
          scoped.roleGroups.push(view.groupKey);
        }
        view.roleKeys.forEach((k) => {
          if (!scoped.userRoles.includes(k)) scoped.userRoles.push(k);
        });
        view.permissionKeys.forEach((k) => {
          if (!scoped.permissions.includes(k)) scoped.permissions.push(k);
        });
      } else {
        groupSet.add(view.groupKey);
        view.roleKeys.forEach((k) => roleSet.add(k));
        view.permissionKeys.forEach((k) => permissionSet.add(k));
      }
    }

    for (const view of directPermissions) {
      if (view.entityId && view.entityType) {
        const scoped = ensureScoped(view.entityId, view.entityType);
        if (!scoped.permissions.includes(view.permissionKey)) {
          scoped.permissions.push(view.permissionKey);
        }
      } else {
        permissionSet.add(view.permissionKey);
      }
    }

    return {
      type: 'jwt',
      idpSub,
      userId: userInfo?.id ?? undefined,
      userInfo: userInfo ?? undefined,
      roleGroups: [...groupSet],
      permissions: [...permissionSet],
      userRoles: [...roleSet],
      scopedAccess: Object.values(scopedAccessByKey),
    };
  }
}
