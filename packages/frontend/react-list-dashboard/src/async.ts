import type { ListAsyncResult, ListObservableLike } from '@ssdev-toolkit/list-dashboard-core';

function isObservableLike<T>(value: unknown): value is ListObservableLike<T> {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function'
  );
}

/** Resolves a Promise, a first Observable emission, or a plain value. */
export function firstAsyncValue<T>(result: ListAsyncResult<T> | T): Promise<T> {
  if (!isObservableLike<T>(result)) {
    return Promise.resolve(result as T);
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let subscription: { unsubscribe?: () => void } | (() => void) | void;
    const cleanup = (): void => {
      if (typeof subscription === 'function') subscription();
      else subscription?.unsubscribe?.();
    };
    const succeed = (value: T): void => {
      if (settled) return;
      settled = true;
      resolve(value);
      queueMicrotask(cleanup);
    };
    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    try {
      subscription = result.subscribe({
        next: succeed,
        error: fail,
        complete: () => {
          if (!settled) fail(new Error('List source completed without a value'));
        },
      });
    } catch (error) {
      fail(error);
    }
  });
}
