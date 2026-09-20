export class GrantUserPermissionCommand {
  constructor(
    public readonly idpSub: string,
    public readonly permissionKey: string,
    public readonly ownerId: string | undefined,
    public readonly grantedBy: string,
    public readonly note?: string,
    public readonly entityId?: string,
    public readonly entityType?: string,
  ) {}
}
