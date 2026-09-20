import 'reflect-metadata';
import { ApiKeyPermissionsPolicy } from './api-key-permissions.policy';
import { InsufficientPermissionsError } from '../errors/auth.errors';

describe('ApiKeyPermissionsPolicy', () => {
  let policy: ApiKeyPermissionsPolicy;

  beforeEach(() => {
    policy = new ApiKeyPermissionsPolicy();
  });

  describe('assertCanDelegate()', () => {
    it('does not throw when caller has all requested permissions', () => {
      expect(() =>
        policy.assertCanDelegate(
          ['read:roles', 'read:permissions'],
          ['read:roles', 'read:permissions', 'create:api_keys'],
        ),
      ).not.toThrow();
    });

    it('does not throw when the requested list is empty', () => {
      expect(() =>
        policy.assertCanDelegate([], ['read:roles']),
      ).not.toThrow();
    });

    it('does not throw when both lists are empty', () => {
      expect(() => policy.assertCanDelegate([], [])).not.toThrow();
    });

    it('throws InsufficientPermissionsError when caller is missing one permission', () => {
      expect(() =>
        policy.assertCanDelegate(
          ['read:roles', 'delete:api_keys'],
          ['read:roles'],
        ),
      ).toThrow(InsufficientPermissionsError);
    });

    it('throws InsufficientPermissionsError when caller has no permissions at all', () => {
      expect(() =>
        policy.assertCanDelegate(['read:roles'], []),
      ).toThrow(InsufficientPermissionsError);
    });

    it('throws InsufficientPermissionsError when caller has entirely different permissions', () => {
      expect(() =>
        policy.assertCanDelegate(['delete:api_keys'], ['read:roles']),
      ).toThrow(InsufficientPermissionsError);
    });

    it('is case-sensitive — does not consider Read:roles equal to read:roles', () => {
      expect(() =>
        policy.assertCanDelegate(['read:roles'], ['Read:roles']),
      ).toThrow(InsufficientPermissionsError);
    });
  });
});
