import 'reflect-metadata';
import { RoleResponseMapper } from './role-response.mapper';
import { Role } from '../../domain/aggregates/role/role.aggregate';

function makeRole(overrides: Partial<ConstructorParameters<typeof Role>[0]> = {}): Role {
  return new Role({
    id: 'role-id-1',
    key: 'admin',
    description: 'Administrator role',
    permissionKeys: ['read:roles', 'create:api_keys'],
    createdAt: new Date('2026-01-01'),
    ...overrides,
  });
}

describe('RoleResponseMapper', () => {
  describe('toDto()', () => {
    it('maps all scalar fields from the aggregate', () => {
      const role = makeRole();

      const dto = RoleResponseMapper.toDto(role);

      expect(dto.id).toBe('role-id-1');
      expect(dto.key).toBe('admin');
      expect(dto.description).toBe('Administrator role');
      expect(dto.permissionKeys).toEqual(['read:roles', 'create:api_keys']);
      expect(dto.createdAt).toEqual(new Date('2026-01-01'));
    });

    it('maps an empty permissionKeys list', () => {
      const role = makeRole({ permissionKeys: [] });

      const dto = RoleResponseMapper.toDto(role);

      expect(dto.permissionKeys).toEqual([]);
    });

    it('handles undefined description', () => {
      const role = makeRole({ description: undefined });

      const dto = RoleResponseMapper.toDto(role);

      expect(dto.description).toBeUndefined();
    });
  });
});
