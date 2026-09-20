import { InsufficientPermissionsError } from '../errors/auth.errors';

export class ApiKeyPermissionsPolicy {
  assertCanDelegate(requestedPermissions: string[], callerPermissions: string[]): void {
    const excess = requestedPermissions.filter((p) => !callerPermissions.includes(p));
    if (excess.length > 0) throw new InsufficientPermissionsError();
  }
}
