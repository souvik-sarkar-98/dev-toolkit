import { AuthUser } from '../models/auth-user';

export const IJwtVerifierPort = Symbol('IJwtVerifierPort');

export interface IJwtVerifierPort {
  verify(token: string): Promise<AuthUser>;
}
