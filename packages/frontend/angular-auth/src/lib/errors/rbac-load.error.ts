export type RbacLoadFailureReason = 'failed' | 'cleared';

/** Thrown when RBAC snapshot is unavailable (load failed, session cleared, or unauthorized). */
export class RbacNotLoadedError extends Error {
  readonly reason: RbacLoadFailureReason;

  constructor(reason: RbacLoadFailureReason, message?: string) {
    super(message ?? `RBAC snapshot not available (${reason})`);
    this.name = 'RbacNotLoadedError';
    this.reason = reason;
  }
}
