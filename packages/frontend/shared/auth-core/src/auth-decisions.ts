export type AuthGuardAction = 'allow' | 'login' | 'unauthorized' | 'redirect';

export type AuthGuardDecision =
  | { action: 'allow' }
  | { action: 'login'; redirectTo?: string }
  | { action: 'unauthorized'; url: string }
  | { action: 'redirect'; url: string };

export interface NavigationExecutor {
  goToLogin(redirectTo?: string): unknown | Promise<unknown>;
  goTo(url: string): unknown | Promise<unknown>;
}

export interface IdentityProvider {
  isLoggedIn(): boolean | Promise<boolean>;
}

export interface RbacLoader<T> {
  load(): Promise<T>;
  clear(): void;
}

export function decideAuthGuard(isLoggedIn: boolean, requestedUrl: string): AuthGuardDecision {
  if (isLoggedIn) {
    return { action: 'allow' };
  }
  const redirectTo = requestedUrl !== '/' ? requestedUrl : undefined;
  return { action: 'login', redirectTo };
}

export function decideNoAuthGuard(isLoggedIn: boolean, postLoginUrl: string): AuthGuardDecision {
  if (isLoggedIn) {
    return { action: 'redirect', url: postLoginUrl };
  }
  return { action: 'allow' };
}

export function decidePermissionGuard(input: {
  rbacAvailable: boolean;
  allowed: boolean;
  loginUrl: string;
  postLoginUrl: string;
}): AuthGuardDecision {
  if (!input.rbacAvailable) {
    return { action: 'login' };
  }
  if (input.allowed) {
    return { action: 'allow' };
  }
  return { action: 'unauthorized', url: input.postLoginUrl };
}

export async function applyAuthGuardDecision(
  decision: AuthGuardDecision,
  navigation: NavigationExecutor,
): Promise<boolean> {
  switch (decision.action) {
    case 'allow':
      return true;
    case 'login':
      await navigation.goToLogin(decision.redirectTo);
      return false;
    case 'unauthorized':
      await navigation.goTo(decision.url);
      return false;
    case 'redirect':
      await navigation.goTo(decision.url);
      return false;
  }
}

export async function loadRbacAfterLogin(
  isLoggedIn: boolean,
  load: () => Promise<unknown>,
): Promise<void> {
  if (!isLoggedIn) return;
  try {
    await load();
  } catch {
    // fail-closed: waitUntilLoaded rejects for failed loads
  }
}

/**
 * Returns url when it is a safe same-app relative path; otherwise fallback.
 * Pass `origin` from the host (browser location) when available so absolute
 * resolution can be checked without importing `window` into core.
 */
export function sanitizeInternalRedirectUrl(
  url: string | undefined | null,
  fallback: string,
  origin?: string,
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

  if (!origin) {
    return trimmed;
  }

  try {
    const resolved = new URL(trimmed, origin);
    if (resolved.origin !== origin) {
      return fallback;
    }
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return fallback;
  }
}
