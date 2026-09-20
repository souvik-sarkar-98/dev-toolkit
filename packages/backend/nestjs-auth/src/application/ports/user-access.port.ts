import { AuthUser } from '../models/auth-user';

export const IUserAccessPort = Symbol('IUserAccessPort');

export interface IUserAccessPort {
  resolve(idpSub: string): Promise<AuthUser>;
  invalidate(idpSub: string): Promise<void>;
  invalidateMany(idpSubs: string[]): Promise<void>;
}
