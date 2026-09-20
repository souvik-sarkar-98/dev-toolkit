import { TokenScope } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/token-scope.vo';
import { BusinessError } from '@ssdev-toolkit/nestjs-core';

describe('TokenScope value object', () => {
  describe('of()', () => {
    it('parses a space-separated scope string', () => {
      const scope = TokenScope.of('openid email profile');
      expect(scope.scopes).toEqual(['email', 'openid', 'profile']);
    });

    it('parses an array of scopes', () => {
      const scope = TokenScope.of(['openid', 'email']);
      expect(scope.scopes).toContain('email');
      expect(scope.scopes).toContain('openid');
    });

    it('deduplicates scopes', () => {
      const scope = TokenScope.of('openid openid email');
      expect(scope.scopes.filter((s) => s === 'openid')).toHaveLength(1);
    });

    it('sorts scopes alphabetically for consistent equality', () => {
      const s1 = TokenScope.of('email openid');
      const s2 = TokenScope.of('openid email');
      expect(s1.toString()).toBe(s2.toString());
    });

    it('trims whitespace from individual scopes', () => {
      const scope = TokenScope.of('  openid  email  ');
      expect(scope.scopes).toContain('openid');
      expect(scope.scopes).toContain('email');
    });

    it('throws BusinessError when an empty string is provided', () => {
      expect(() => TokenScope.of('')).toThrow(BusinessError);
    });

    it('throws BusinessError when an all-whitespace string is provided', () => {
      expect(() => TokenScope.of('   ')).toThrow(BusinessError);
    });

    it('throws BusinessError when an empty array is provided', () => {
      expect(() => TokenScope.of([])).toThrow(BusinessError);
    });

    it('handles array elements with embedded spaces (splits them)', () => {
      const scope = TokenScope.of(['openid email', 'profile']);
      expect(scope.scopes).toContain('openid');
      expect(scope.scopes).toContain('email');
      expect(scope.scopes).toContain('profile');
    });
  });

  describe('fromStorage()', () => {
    it('reconstructs scope from a stored string', () => {
      const scope = TokenScope.fromStorage('openid email');
      expect(scope).not.toBeNull();
      expect(scope!.scopes).toContain('openid');
    });

    it('returns null for null input', () => {
      expect(TokenScope.fromStorage(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(TokenScope.fromStorage(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(TokenScope.fromStorage('')).toBeNull();
    });
  });

  describe('contains()', () => {
    it('returns true when the scope set contains the given scope', () => {
      const scope = TokenScope.of('openid email profile');
      expect(scope.contains('email')).toBe(true);
    });

    it('returns false when the scope is not present', () => {
      const scope = TokenScope.of('openid email');
      expect(scope.contains('drive')).toBe(false);
    });

    it('is case-insensitive', () => {
      const scope = TokenScope.of('openid EMAIL');
      expect(scope.contains('email')).toBe(true);
    });

    it('matches via substring for namespaced scopes', () => {
      const scope = TokenScope.of('https://mail.google.com/');
      expect(scope.contains('mail.google')).toBe(true);
    });
  });

  describe('assertAllowed()', () => {
    it('does not throw when all scopes are in the allowlist', () => {
      const scope = TokenScope.of('openid email');
      expect(() => scope.assertAllowed(['openid', 'email', 'profile'])).not.toThrow();
    });

    it('throws BusinessError when any scope is not in the allowlist', () => {
      const scope = TokenScope.of('openid not.allowed.scope');
      expect(() => scope.assertAllowed(['openid', 'email'])).toThrow(BusinessError);
    });

    it('throws with status 403', () => {
      const scope = TokenScope.of('drive.admin');
      try {
        scope.assertAllowed(['openid']);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.statusCode).toBe(403);
      }
    });
  });

  describe('toString()', () => {
    it('returns a space-separated, sorted scope string', () => {
      const scope = TokenScope.of('profile email openid');
      expect(scope.toString()).toBe('email openid profile');
    });
  });

  describe('equals()', () => {
    it('returns true for two scopes with the same effective scopes', () => {
      const s1 = TokenScope.of('openid email');
      const s2 = TokenScope.of('email openid');
      expect(s1.equals(s2)).toBe(true);
    });

    it('returns false for two scopes with different content', () => {
      const s1 = TokenScope.of('openid');
      const s2 = TokenScope.of('email');
      expect(s1.equals(s2)).toBe(false);
    });
  });
});
