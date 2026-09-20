import 'reflect-metadata';
import { UserAccessAdapter } from './user-access.adapter';
import { AuthModuleOptions } from '../../auth-options';

type DirectRoleView = {
  roleKey: string;
  permissionKeys: string[];
  ownerId?: string;
  entityId?: string;
  entityType?: string;
};
type GroupMembershipView = {
  groupKey: string;
  roleKeys: string[];
  permissionKeys: string[];
  ownerId?: string;
  entityId?: string;
  entityType?: string;
};

const makeUserRoleRepo = () => ({
  resolveDirectPermissions: jest.fn<Promise<DirectRoleView[]>, [string]>(),
  revokeSourcedRoles: jest.fn(),
  findActiveByUserSub: jest.fn(),
  bulkCreate: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
});

const makeUserRoleGroupRepo = () => ({
  resolveGroupPermissions: jest.fn<Promise<GroupMembershipView[]>, [string]>(),
  revokeGroupMembership: jest.fn(),
  findActiveByUserSub: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
});

const makeUserPermissionRepo = () => ({
  resolveDirectUserPermissions: jest.fn().mockResolvedValue([]),
  findActiveByIdPSub: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
});

const makeCache = () => ({
  getOrSet: jest.fn(),
  del: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  set: jest.fn(),
});

const defaultOptions: AuthModuleOptions = {
  jwt: { jwksUri: 'https://example.com', issuer: 'iss', audience: 'aud' },
  cache: { userAccessTtlMs: 1000 },
};

function buildAdapter(options: AuthModuleOptions = defaultOptions) {
  const userRoleRepo = makeUserRoleRepo();
  const userRoleGroupRepo = makeUserRoleGroupRepo();
  const userPermissionRepo = makeUserPermissionRepo();
  const cache = makeCache();
  const userLookup = { findByIdPSub: jest.fn().mockResolvedValue(null) };
  const adapter = new UserAccessAdapter(
    userRoleRepo as any,
    userRoleGroupRepo as any,
    userPermissionRepo as any,
    options,
    cache as any,
    userLookup as any,
  );
  return { adapter, userRoleRepo, userRoleGroupRepo, userPermissionRepo, cache, userLookup };
}

describe('UserAccessAdapter', () => {
  describe('resolve()', () => {
    it('returns cached value on cache hit without calling repositories', async () => {
      const { adapter, userRoleRepo, userRoleGroupRepo, cache } = buildAdapter();
      const cachedUser = {
        type: 'jwt' as const,
        sub: 'user|abc',
        permissions: ['read:roles'],
        userRoles: ['admin'],
        roleGroups: ['super-admins'],
      };
      cache.getOrSet.mockResolvedValue(cachedUser);

      const result = await adapter.resolve('user|abc');

      expect(result).toEqual(cachedUser);
      expect(userRoleRepo.resolveDirectPermissions).not.toHaveBeenCalled();
      expect(userRoleGroupRepo.resolveGroupPermissions).not.toHaveBeenCalled();
    });

    it('merges direct roles and group memberships on cache miss', async () => {
      const { adapter, userRoleRepo, userRoleGroupRepo, cache, userLookup } = buildAdapter();

      cache.getOrSet.mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());
      userRoleRepo.resolveDirectPermissions.mockResolvedValue([
        { roleKey: 'editor', permissionKeys: ['read:roles'], ownerId: 'u-1' },
      ]);
      userRoleGroupRepo.resolveGroupPermissions.mockResolvedValue([
        { groupKey: 'super-admins', roleKeys: ['admin'], permissionKeys: ['delete:api_keys'], ownerId: 'u-1' },
      ]);
      userLookup.findByIdPSub.mockResolvedValue({ id: 'u-1', idpSub: 'user|abc' });

      const result = await adapter.resolve('user|abc');

      expect(result.idpSub).toBe('user|abc');
      expect(result.type).toBe('jwt');
      expect(result.permissions).toEqual(expect.arrayContaining(['read:roles', 'delete:api_keys']));
      expect(result.userRoles).toEqual(expect.arrayContaining(['editor', 'admin']));
      expect(result.roleGroups).toEqual(['super-admins']);
      expect(result.userId).toBe('u-1');
    });

    it('deduplicates permissions that appear in both direct roles and group memberships', async () => {
      const { adapter, userRoleRepo, userRoleGroupRepo, cache } = buildAdapter();
      cache.getOrSet.mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());
      userRoleRepo.resolveDirectPermissions.mockResolvedValue([
        { roleKey: 'editor', permissionKeys: ['read:roles'] },
      ]);
      userRoleGroupRepo.resolveGroupPermissions.mockResolvedValue([
        { groupKey: 'readers', roleKeys: ['viewer'], permissionKeys: ['read:roles'] },
      ]);

      const result = await adapter.resolve('user|abc');

      const readRolesCount = result.permissions!.filter((p) => p === 'read:roles').length;
      expect(readRolesCount).toBe(1);
    });

    it('uses the configured TTL when calling cache.getOrSet', async () => {
      const { adapter, cache } = buildAdapter({ ...defaultOptions, cache: { userAccessTtlMs: 5000 } });
      cache.getOrSet.mockResolvedValue({ type: 'jwt', sub: 'u', permissions: [], userRoles: [], roleGroups: [] });

      await adapter.resolve('user|abc');

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'user-access:user|abc',
        expect.any(Function),
        5000,
      );
    });

    it('falls back to default TTL of 1_800_000 ms when not configured', async () => {
      const options: AuthModuleOptions = {
        jwt: { jwksUri: 'https://example.com', issuer: 'iss', audience: 'aud' },
      };
      const { adapter, cache } = buildAdapter(options);
      cache.getOrSet.mockResolvedValue({ type: 'jwt', sub: 'u', permissions: [], userRoles: [], roleGroups: [] });

      await adapter.resolve('user|abc');

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'user-access:user|abc',
        expect.any(Function),
        1_800_000,
      );
    });

    it('returns empty arrays when the user has no roles or groups', async () => {
      const { adapter, userRoleRepo, userRoleGroupRepo, cache } = buildAdapter();
      cache.getOrSet.mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());
      userRoleRepo.resolveDirectPermissions.mockResolvedValue([]);
      userRoleGroupRepo.resolveGroupPermissions.mockResolvedValue([]);

      const result = await adapter.resolve('user|no-roles');

      expect(result.permissions).toEqual([]);
      expect(result.userRoles).toEqual([]);
      expect(result.roleGroups).toEqual([]);
      expect(result.userId).toBeUndefined();
    });

    it('builds scopedAccess for entity-scoped roles, groups, and permissions', async () => {
      const { adapter, userRoleRepo, userRoleGroupRepo, userPermissionRepo, cache } = buildAdapter();
      cache.getOrSet.mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());
      userRoleRepo.resolveDirectPermissions.mockResolvedValue([
        {
          roleKey: 'coordinator',
          permissionKeys: ['read:projects', 'update:project'],
          entityId: 'proj-A',
          entityType: 'project',
        },
        { roleKey: 'editor', permissionKeys: ['read:roles'] },
      ]);
      userRoleGroupRepo.resolveGroupPermissions.mockResolvedValue([
        {
          groupKey: 'field_team',
          roleKeys: ['volunteer_coordinator'],
          permissionKeys: ['update:project', 'read:donations'],
          entityId: 'proj-A',
          entityType: 'project',
        },
      ]);
      userPermissionRepo.resolveDirectUserPermissions.mockResolvedValue([
        { permissionKey: 'close:project', entityId: 'proj-A', entityType: 'project' },
        { permissionKey: 'read:users' },
      ]);

      const result = await adapter.resolve('user|abc');

      expect(result.permissions).toEqual(expect.arrayContaining(['read:roles', 'read:users']));
      expect(result.permissions).not.toEqual(expect.arrayContaining(['read:projects', 'update:project']));
      expect(result.userRoles).toEqual(['editor']);
      expect(result.roleGroups).toEqual([]);
      expect(result.scopedAccess).toEqual([
        {
          entityId: 'proj-A',
          entityType: 'project',
          userRoles: ['coordinator', 'volunteer_coordinator'],
          roleGroups: ['field_team'],
          permissions: ['read:projects', 'update:project', 'read:donations', 'close:project'],
        },
      ]);
    });

    it('creates a scopedAccess entry from a first-time entity-scoped grant without throwing', async () => {
      const { adapter, userRoleRepo, userRoleGroupRepo, cache } = buildAdapter();
      cache.getOrSet.mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());
      userRoleRepo.resolveDirectPermissions.mockResolvedValue([
        {
          roleKey: 'coordinator',
          permissionKeys: ['read:projects'],
          entityId: 'proj-B',
          entityType: 'project',
        },
      ]);
      userRoleGroupRepo.resolveGroupPermissions.mockResolvedValue([]);

      await expect(adapter.resolve('user|abc')).resolves.toMatchObject({
        scopedAccess: [
          {
            entityId: 'proj-B',
            entityType: 'project',
            userRoles: ['coordinator'],
            permissions: ['read:projects'],
            roleGroups: [],
          },
        ],
      });
    });
  });

  describe('invalidate()', () => {
    it('calls cache.del with the correct user-access cache key', async () => {
      const { adapter, cache } = buildAdapter();

      await adapter.invalidate('user|abc');

      expect(cache.del).toHaveBeenCalledWith('user-access:user|abc');
    });
  });
});
