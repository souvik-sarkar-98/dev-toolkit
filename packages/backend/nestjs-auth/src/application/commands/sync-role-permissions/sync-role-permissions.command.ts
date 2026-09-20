export class SyncRolePermissionsCommand {
  constructor(
    public readonly key: string,
    public readonly permissionKeys: string[],
  ) {}
}
