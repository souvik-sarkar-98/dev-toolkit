import { AuthUser } from '../models/auth-user';

export const IApiKeyVerifierPort = Symbol('IApiKeyVerifierPort');

export interface IApiKeyVerifierPort {
  validate(rawKey: string): Promise<AuthUser>;
  invalidate(keyId: string): Promise<void>;
}
