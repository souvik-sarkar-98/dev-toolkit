export class UnsubscribeRoleCommand {
  constructor(
    public readonly roleName: string,
    public readonly resourceType: string,
    public readonly resourceId?: string,
  ) {}
}
