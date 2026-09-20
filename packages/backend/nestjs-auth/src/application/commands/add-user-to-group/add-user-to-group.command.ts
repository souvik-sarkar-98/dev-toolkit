export class AddUserToGroupCommand {
  constructor(
    public readonly idpSub: string,
    public readonly groupKey: string,
    public readonly ownerId: string | undefined,
    public readonly grantedBy: string,
    public readonly note?: string,
    public readonly entityId?: string,
    public readonly entityType?: string,
  ) {}
}
