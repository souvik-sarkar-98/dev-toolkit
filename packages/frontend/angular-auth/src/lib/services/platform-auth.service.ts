import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthUser } from '@ssdev-toolkit/auth-core';

export type LoginType = 'email' | 'password' | 'sms';

/**
 * The auth contract the rest of the app codes against.
 * Implement this abstract class and register it via a factory provider in your app's CoreAuthModule.
 */
export abstract class PlatformAuthService {
  abstract get isAuthenticated$(): Observable<boolean>;
  abstract get user$(): Observable<AuthUser | null | undefined>;
  abstract getAccessTokenSilently(): Observable<string>;
  abstract initialize(): void;
  abstract loginWith(loginType: LoginType, prompt?: string, redirectUrl?: string): void;
  abstract logout(): void;
}
