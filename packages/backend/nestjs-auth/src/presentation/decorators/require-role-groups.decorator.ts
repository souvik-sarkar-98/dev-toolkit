import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ROLE_GROUPS_KEY = 'role_groups';

export const RequireRoleGroups = (...groups: string[]) =>
  SetMetadata(REQUIRE_ROLE_GROUPS_KEY, groups);
