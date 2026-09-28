import { sanitizeInternalRedirectUrl as sanitizeInternalRedirectUrlCore } from '@ssdev-toolkit/auth-core';

/**
 * Returns url when it is a safe same-app relative path; otherwise fallback.
 * Host-only: reads `window.location.origin` when present.
 */
export function sanitizeInternalRedirectUrl(
  url: string | undefined | null,
  fallback: string,
): string {
  const origin =
    typeof globalThis !== 'undefined'
    && typeof (globalThis as { window?: { location?: { origin?: string } } }).window !== 'undefined'
      ? (globalThis as { window: { location?: { origin?: string } } }).window.location?.origin
      : undefined;
  return sanitizeInternalRedirectUrlCore(url, fallback, origin);
}
