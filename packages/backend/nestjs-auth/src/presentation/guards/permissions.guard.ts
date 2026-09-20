import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY, REQUIRE_ALL_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthUser } from '../../application/models/auth-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredAll = this.reflector.getAllAndOverride<string[]>(REQUIRE_ALL_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const hasAnyDecorator =
      (required && required.length > 0) || (requiredAll && requiredAll.length > 0);
    if (!hasAnyDecorator) return true;

    const user: AuthUser = context.switchToHttp().getRequest().user;
    if (!user?.permissions) return false;

    // @RequirePermissions — any-of semantics
    const passedAny =
      !required || required.length === 0 || required.some((p) => user.permissions!.includes(p));

    // @RequireAllPermissions — all-of semantics
    const passedAll =
      !requiredAll ||
      requiredAll.length === 0 ||
      requiredAll.every((p) => user.permissions!.includes(p));

    return passedAny && passedAll;
  }
}
