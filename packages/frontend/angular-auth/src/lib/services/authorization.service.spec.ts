import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { contextFrom, snapshotFromCurrentUser } from '@ssdev-toolkit/auth-core';
import { AuthorizationService } from './authorization.service';
import { RbacStateService } from './rbac-state.service';
import { RBAC_DATA_SOURCE } from '../tokens/rbac-data-source.token';
import { RbacNotLoadedError } from '../errors/rbac-load.error';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let state: RbacStateService;

  const globalUser = snapshotFromCurrentUser({
    idpSub: 'auth0|abc',
    permissions: ['read:projects', 'update:users'],
    userRoles: ['admin'],
    roleGroups: ['field_team'],
    scopedAccess: [
      {
        entityId: 'proj-A',
        entityType: 'project',
        permissions: ['update:project'],
        userRoles: ['volunteer_coordinator'],
        roleGroups: [],
      },
    ],
  });

  function createService(
    fetchCurrentUserSnapshot: () => ReturnType<typeof of<typeof globalUser>> = () => of(globalUser),
  ): void {
    state = new RbacStateService();
    service = new AuthorizationService({ fetchCurrentUserSnapshot }, state);
  }

  beforeEach(() => {
    createService();
  });

  it('loads global permissions from /api/auth/me snapshot', async () => {
    await service.load();
    expect(service.hasPermission('read:projects')).toBe(true);
    expect(service.hasPermission('delete:jobs')).toBe(false);
  });

  it('unions global and scoped permissions for context checks', async () => {
    await service.load();
    const ctx = contextFrom('project', 'proj-A');
    expect(service.hasPermissionInContext('read:projects', ctx)).toBe(true);
    expect(service.hasPermissionInContext('update:project', ctx)).toBe(true);
    expect(service.effectivePermissions(ctx)).toContain('read:projects');
    expect(service.effectivePermissions(ctx)).toContain('update:project');
  });

  it('scoped-only permissions are not visible outside context', async () => {
    await service.load();
    expect(service.hasPermission('update:project')).toBe(false);
    expect(
      service.hasPermissionInContext('update:project', service.contextFrom('project', 'proj-A')),
    ).toBe(true);
  });

  it('hasAnyRole checks role keys', async () => {
    await service.load();
    expect(service.hasAnyRole('admin', 'guest')).toBe(true);
  });

  it('clear resets loaded state', async () => {
    await service.load();
    service.clear();
    expect(state.loaded).toBe(false);
    expect(state.loadState).toBe('cleared');
    expect(service.hasPermission('read:projects')).toBe(false);
  });

  it('waitUntilLoaded rejects when RBAC was cleared', async () => {
    await service.load();
    service.clear();

    await expect(service.waitUntilLoaded()).rejects.toBeInstanceOf(RbacNotLoadedError);
  });

  it('load marks state failed and waitUntilLoaded rejects on error', async () => {
    createService(() => throwError(() => new Error('network')));

    await expect(service.load()).rejects.toThrow('network');
    expect(state.loadState).toBe('failed');

    await expect(service.waitUntilLoaded()).rejects.toBeInstanceOf(RbacNotLoadedError);
  });
});
