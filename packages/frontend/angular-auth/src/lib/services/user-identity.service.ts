import { Injectable } from '@angular/core';
import { filter, firstValueFrom, map } from 'rxjs';
import { AuthUser, loadRbacAfterLogin, RbacUserAccessSnapshot } from '@ssdev-toolkit/auth-core';
import { PlatformAuthService, LoginType } from './platform-auth.service';
import { AuthorizationService } from './authorization.service';

@Injectable({ providedIn: 'root' })
export class UserIdentityService<T extends RbacUserAccessSnapshot = RbacUserAccessSnapshot> {
  isLoggedIn!: boolean;
  /** OIDC claims from the Auth0 token — app-domain profile fields are NOT here. */
  loggedInUser!: AuthUser;

  constructor(
    protected platformAuth: PlatformAuthService,
    protected authorization: AuthorizationService<T>,
  ) {}

  async configure(): Promise<void> {
    this.platformAuth.initialize();
    this.isLoggedIn = await this.isUserLoggedIn();
    if (this.isLoggedIn) {
      this.loggedInUser = await this.getUser();
      await loadRbacAfterLogin(true, () => this.authorization.load());
    }
  }

  loginWith(loginType: LoginType, prompt?: string, redirectUrl?: string): void {
    this.platformAuth.loginWith(loginType, prompt, redirectUrl);
  }

  logout(): void {
    this.authorization.clear();
    this.platformAuth.logout();
  }

  async isUserLoggedIn(): Promise<boolean> {
    return await firstValueFrom(this.platformAuth.isAuthenticated$);
  }

  async getAccessToken(): Promise<string> {
    return await firstValueFrom(this.platformAuth.getAccessTokenSilently());
  }

  async getUser(): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.platformAuth.user$.pipe(filter((value): value is AuthUser => !!value)),
    );
    return user;
  }
}
