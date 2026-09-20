import { BusinessError } from '@ssdev-toolkit/nestjs-core';

/**
 * Immutable value object representing an OAuth scope set.
 *
 * Normalises the scope string (trims, deduplicates, sorts) so that two
 * TokenScope instances with the same effective scopes are structurally equal,
 * regardless of the order they were originally provided.
 *
 * Equality is by value — no identity.
 */
export class TokenScope {
  private readonly _scopes: readonly string[];

  private constructor(scopes: string[]) {
    this._scopes = Object.freeze([...new Set(scopes.map((s) => s.trim()).filter(Boolean))].sort());
  }

  static of(raw: string | string[]): TokenScope {
    const scopes = Array.isArray(raw)
      ? raw.flatMap((s) => s.split(' '))
      : raw.split(' ');
    const cleaned = scopes.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      throw new BusinessError('At least one OAuth scope is required.', 'OAUTH_EMPTY_SCOPE');
    }
    return new TokenScope(cleaned);
  }

  /** Reconstructs from a DB-stored scope string without throwing on empty (returns null-safe empty). */
  static fromStorage(raw: string | null | undefined): TokenScope | null {
    if (!raw || !raw.trim()) return null;
    return new TokenScope(raw.split(' '));
  }

  /** Returns true if this scope set contains the given scope as a substring match. */
  contains(scope: string): boolean {
    const target = scope.trim().toLowerCase();
    return this._scopes.some((s) => s.toLowerCase().includes(target));
  }

  /** Validates that all scopes in this set are in the allowed list. */
  assertAllowed(allowed: string[]): void {
    const allowedSet = new Set(allowed.map((s) => s.toLowerCase()));
    const invalid = this._scopes.filter((s) => !allowedSet.has(s.toLowerCase()));
    if (invalid.length > 0) {
      throw new BusinessError(
        `Scopes not in allowlist: [${invalid.join(', ')}]`,
        'OAUTH_SCOPE_NOT_ALLOWED',
        403,
      );
    }
  }

  /** Space-separated scope string suitable for storage and OAuth requests. */
  toString(): string {
    return this._scopes.join(' ');
  }

  get scopes(): readonly string[] {
    return this._scopes;
  }

  equals(other: TokenScope): boolean {
    return this.toString() === other.toString();
  }
}
