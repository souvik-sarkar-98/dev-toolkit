/** Opaque transaction handle when lock and DB work must share a connection. */
export type LockTransaction = unknown;

export const ILockingPort = Symbol('ILockingPort');

/**
 * Distributed / advisory locking for concurrent operations.
 * The host app registers a database-specific implementation (e.g. Postgres advisory
 * locks, MySQL GET_LOCK). Packages depend on this port — never on a concrete adapter.
 */
export interface ILockingPort {
  withLock<T>(key: string, fn: (tx: LockTransaction) => Promise<T>): Promise<T>;

  withLocks<T>(
    keys: string[],
    fn: (tx?: LockTransaction) => Promise<T>,
  ): Promise<T>;
}
