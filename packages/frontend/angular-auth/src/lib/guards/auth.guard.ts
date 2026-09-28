import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import {
  applyAuthGuardDecision,
  decideAuthGuard,
  decideNoAuthGuard,
} from '@ssdev-toolkit/auth-core';
import { USER_IDENTITY } from '../tokens/user-identity.token';
import { AUTH_CONFIG } from '../tokens/auth-config.token';
import { sanitizeInternalRedirectUrl } from '../utils/redirect-url.util';

export { permissionGuard, PermissionGuardOptions } from './permission.guard';

function routerNavigation(router: Router, loginUrl: string, postLoginUrl: string) {
  return {
    goToLogin(redirectTo?: string) {
      const safe = redirectTo ? sanitizeInternalRedirectUrl(redirectTo, '') : '';
      if (safe) {
        router.navigate([loginUrl], { state: { redirect_to: safe } });
      } else {
        router.navigate([loginUrl]);
      }
    },
    goTo(url: string) {
      if (url === postLoginUrl || url.startsWith('/')) {
        router.navigateByUrl(url);
      } else {
        router.navigate([url]);
      }
    },
  };
}

export async function authGuard(
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Promise<boolean> {
  const identityService = inject(USER_IDENTITY);
  const router = inject(Router);
  const config = inject(AUTH_CONFIG);
  const loggedIn = await identityService.isUserLoggedIn();
  return applyAuthGuardDecision(
    decideAuthGuard(loggedIn, state.url),
    routerNavigation(router, config.loginUrl, config.postLoginUrl),
  );
}

export async function noAuthGuard(): Promise<boolean> {
  const identityService = inject(USER_IDENTITY);
  const router = inject(Router);
  const config = inject(AUTH_CONFIG);
  const loggedIn = await identityService.isUserLoggedIn();
  return applyAuthGuardDecision(
    decideNoAuthGuard(loggedIn, config.postLoginUrl),
    routerNavigation(router, config.loginUrl, config.postLoginUrl),
  );
}
