import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ROLE_GROUPS_KEY } from '../decorators/require-role-groups.decorator';
import { AuthUser } from '../../application/models/auth-user';

@Injectable()
export class RoleGroupsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_ROLE_GROUPS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthUser = context.switchToHttp().getRequest().user;
    if (!user?.roleGroups) return false;
    return required.some((g) => user.roleGroups!.includes(g));
  }
}
