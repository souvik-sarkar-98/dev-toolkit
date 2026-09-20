import { InjectionToken } from '@angular/core';
import { AuthUser } from '@ssdev-toolkit/auth-core';
import { LoginType } from '../services/platform-auth.service';

/** Minimal identity contract used by guards and HTTP error handling. */
export interface UserIdentityFacade {
  configure(): Promise<void>;
  loginWith(loginType: LoginType, prompt?: string, redirectUrl?: string): void;
  logout(): void;
  isUserLoggedIn(): Promise<boolean>;
  getAccessToken(): Promise<string>;
  getUser(): Promise<AuthUser>;
}

export const USER_IDENTITY = new InjectionToken<UserIdentityFacade>('USER_IDENTITY');
