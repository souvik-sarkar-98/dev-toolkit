import { AsyncLocalStorage } from 'async_hooks';
import { generateUniqueNDigitNumber } from './password-util';

export interface UserContext {
  userId: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TraceContext {
  traceId: string;
  user?: UserContext;
}

export const traceStorage = new AsyncLocalStorage<TraceContext>();

export function getTraceId(): string | undefined {
  return traceStorage.getStore()?.traceId;
}

export function getUserContext(): UserContext | undefined {
  return traceStorage.getStore()?.user;
}

/**
 * Updates the user fields in the current async-local-storage trace context.
 * Call this from auth guards after the user identity has been resolved so that
 * the `AuditEntityChangeLog` extension and any other trace-context consumers
 * record the real authenticated user instead of the 'system' placeholder.
 */
export function setUserContext(context: Partial<UserContext>): void {
  const store = traceStorage.getStore();
  if (!store) return;
  store.user = { ...store.user, userId: 'system', ...context };
}

/**
 * Generates or retrieves a trace ID from the request headers.
 */
export function resolveTraceId(headers: Record<string, any>): string {
  return (
    headers['x-request-id'] ||
    headers['x-trace-id'] ||
    `trace-${generateUniqueNDigitNumber(6)}`
  );
}
