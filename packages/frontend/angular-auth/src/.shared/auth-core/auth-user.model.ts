/** Standard OIDC claims from the Auth0 token. No app-domain fields. */
export interface AuthUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  nickname: string;
  picture: string;
}
