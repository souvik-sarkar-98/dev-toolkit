/**
 * Returns url when it is a safe same-app relative path; otherwise fallback.
 * Rejects protocol-relative paths (//), absolute URLs, backslashes, and empty values.
 */
export function sanitizeInternalRedirectUrl(
  url: string | undefined | null,
  fallback: string,
): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  if (trimmed.includes('\\') || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return fallback;
  }

  if (typeof window === 'undefined' || !window.location?.origin) {
    return trimmed;
  }

  try {
    const resolved = new URL(trimmed, window.location.origin);
    if (resolved.origin !== window.location.origin) {
      return fallback;
    }
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return fallback;
  }
}
