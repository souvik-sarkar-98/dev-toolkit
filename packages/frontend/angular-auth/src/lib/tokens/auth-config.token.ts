import { InjectionToken } from '@angular/core';

/** Route configuration that the auth guards need. Provided by each consuming app. */
export interface AuthConfig {
  /** Where unauthenticated users are sent (e.g. login page URL). */
  loginUrl: string;
  /** Default redirect after login and fallback for permission-denied. */
  postLoginUrl: string;
}

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG');
