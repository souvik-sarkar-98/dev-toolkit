import { UnauthorizedException } from '@nestjs/common';
import { AuthUser } from '../models/auth-user';

/** Returns app profile UUID for audit fields. Never use idpSub for domain audit. */
export function requireUserId(user: AuthUser): string {
  if (!user.userId) {
    throw new UnauthorizedException('User profile not resolved');
  }
  return user.userId;
}
