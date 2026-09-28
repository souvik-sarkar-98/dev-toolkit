export type RbacLoadState = 'idle' | 'loading' | 'loaded' | 'failed' | 'cleared';
export type RbacLoadFailureReason = 'failed' | 'cleared';

export class RbacNotLoadedError extends Error {
  readonly reason: RbacLoadFailureReason;

  constructor(reason: RbacLoadFailureReason, message?: string) {
    super(message ?? `RBAC snapshot not available (${reason})`);
    this.name = 'RbacNotLoadedError';
    this.reason = reason;
  }
}

export function inspectWaitUntilLoaded<T>(
  loadState: RbacLoadState,
  snapshot: T | null,
): { status: 'ready'; snapshot: T } | { status: 'reject'; reason: RbacLoadFailureReason } | { status: 'wait' } {
  if (loadState === 'loaded' && snapshot) {
    return { status: 'ready', snapshot };
  }
  if (loadState === 'failed') {
    return { status: 'reject', reason: 'failed' };
  }
  if (loadState === 'cleared') {
    return { status: 'reject', reason: 'cleared' };
  }
  return { status: 'wait' };
}

type Waiter<T> = {
  resolve: (snapshot: T) => void;
  reject: (error: RbacNotLoadedError) => void;
};

export class RbacSession<T> {
  snapshot: T | null = null;
  loaded = false;
  loadState: RbacLoadState = 'idle';
  private waiters: Waiter<T>[] = [];

  beginLoad(): void {
    this.loadState = 'loading';
  }

  setSnapshot(snapshot: T): void {
    this.snapshot = snapshot;
    this.loaded = true;
    this.loadState = 'loaded';
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) waiter.resolve(snapshot);
  }

  markFailed(): void {
    this.snapshot = null;
    this.loaded = false;
    this.loadState = 'failed';
    this.rejectWaiters('failed');
  }

  clear(): void {
    this.snapshot = null;
    this.loaded = false;
    this.loadState = 'cleared';
    this.rejectWaiters('cleared');
  }

  waitUntilLoaded(): Promise<T> {
    const inspected = inspectWaitUntilLoaded(this.loadState, this.snapshot);
    if (inspected.status === 'ready') {
      return Promise.resolve(inspected.snapshot);
    }
    if (inspected.status === 'reject') {
      return Promise.reject(new RbacNotLoadedError(inspected.reason));
    }
    return new Promise<T>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  private rejectWaiters(reason: RbacLoadFailureReason): void {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) waiter.reject(new RbacNotLoadedError(reason));
  }
}
