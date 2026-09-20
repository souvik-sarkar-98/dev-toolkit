import { Inject, Injectable } from '@angular/core';
import { filter, firstValueFrom, map, merge, Observable, take } from 'rxjs';
import {
  contextFrom,
  effectivePermissions as coreEffectivePermissions,
  effectiveRoleGroups as coreEffectiveRoleGroups,
  effectiveRoles as coreEffectiveRoles,
  RbacEntityContext,
  RbacUserAccessSnapshot,
} from '@ssdev-toolkit/auth-core';
import { RbacNotLoadedError } from '../errors/rbac-load.error';
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
    if (this.state.loadState === 'loaded' && this.state.snapshot) {
      return this.state.snapshot;
    }
    if (this.state.loadState === 'failed') {
      throw new RbacNotLoadedError('failed');
    }
    if (this.state.loadState === 'cleared') {
      throw new RbacNotLoadedError('cleared');
    }

    return firstValueFrom(
      merge(
        this.state.snapshot$.pipe(
          filter((snapshot): snapshot is T => snapshot !== null),
          take(1),
        ),
        this.state.loadState$.pipe(
          filter((state) => state === 'failed' || state === 'cleared'),
          take(1),
          map((state) => {
            throw new RbacNotLoadedError(state as 'failed' | 'cleared');
          }),
        ),
      ),
    );
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
