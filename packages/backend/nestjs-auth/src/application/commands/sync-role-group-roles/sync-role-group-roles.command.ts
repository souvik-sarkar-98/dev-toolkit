export class SyncRoleGroupRolesCommand {
  constructor(
    public readonly key: string,
    public readonly roleKeys: string[],
    public readonly grantedBy?: string,
  ) {}
}
