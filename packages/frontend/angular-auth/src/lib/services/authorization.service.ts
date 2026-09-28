import { Inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import {
  contextFrom,
  effectivePermissions as coreEffectivePermissions,
  effectiveRoleGroups as coreEffectiveRoleGroups,
  effectiveRoles as coreEffectiveRoles,
  RbacEntityContext,
  RbacUserAccessSnapshot,
} from '@ssdev-toolkit/auth-core';
import { RBAC_DATA_SOURCE, RbacDataSource } from '../tokens/rbac-data-source.token';
import { RbacStateService } from './rbac-state.service';

@Injectable({ providedIn: 'root' })
export class AuthorizationService<T extends RbacUserAccessSnapshot = RbacUserAccessSnapshot> {
  get snapshot$(): Observable<T | null> {
    return this.state.snapshot$;
  }
  get snapshot(): T | null {
    return this.state.snapshot;
  }
  get loaded$() {
    return this.state.loaded$;
  }

  constructor(
    @Inject(RBAC_DATA_SOURCE) private dataSource: RbacDataSource<T>,
    private state: RbacStateService<T>,
  ) {}

  contextFrom(entityType: string, entityId: string): RbacEntityContext {
    return contextFrom(entityType, entityId);
  }

  async load(): Promise<void> {
    this.state.beginLoad();
    try {
      const snapshot = await firstValueFrom(this.dataSource.fetchCurrentUserSnapshot());
      this.state.setSnapshot(snapshot);
    } catch (error) {
      this.state.markFailed();
      throw error;
    }
  }

  async refresh(): Promise<void> {
    await this.load();
  }

  clear(): void {
    this.state.clear();
  }

  async waitUntilLoaded(): Promise<T> {
    return this.state.session.waitUntilLoaded();
  }

  effectivePermissions(context?: RbacEntityContext): string[] {
    const snapshot = this.state.snapshot;
    if (!snapshot) {
      return [];
    }
    return coreEffectivePermissions(snapshot, context);
  }

  effectiveRoles(context?: RbacEntityContext): string[] {
    const snapshot = this.state.snapshot;
    if (!snapshot) {
      return [];
    }
    return coreEffectiveRoles(snapshot, context);
  }

  effectiveRoleGroups(context?: RbacEntityContext): string[] {
    const snapshot = this.state.snapshot;
    if (!snapshot) {
      return [];
    }
    return coreEffectiveRoleGroups(snapshot, context);
  }

  hasPermission(permission: string): boolean {
    return this.effectivePermissions().includes(permission);
  }

  hasPermissionInContext(permission: string, context: RbacEntityContext): boolean {
    return this.effectivePermissions(context).includes(permission);
  }

  hasAnyRole(...roles: string[]): boolean {
    const current = this.effectiveRoles();
    return roles.some((role) => current.includes(role));
  }
}
