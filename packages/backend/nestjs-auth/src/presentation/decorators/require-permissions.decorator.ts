import { applyDecorators, SetMetadata } from '@nestjs/common';
import { REQUIRE_PERMISSIONS_KEY, REQUIRE_ALL_PERMISSIONS_KEY } from '../../application/constants/permission-keys.constants';
import { ApiExtension } from '@nestjs/swagger';

export { REQUIRE_PERMISSIONS_KEY, REQUIRE_ALL_PERMISSIONS_KEY };

export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions),
    ApiExtension('x-required-permissions', permissions)
  );

export const RequireAllPermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(REQUIRE_ALL_PERMISSIONS_KEY, permissions),
    ApiExtension('x-require-all-permissions', true),
    ApiExtension('x-required-permissions', permissions)
  );
