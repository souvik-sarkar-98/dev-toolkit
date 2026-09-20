import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../application/models/auth-user';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);

export const UserPermissions = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return (request.user as AuthUser)?.permissions ?? [];
  },
);
