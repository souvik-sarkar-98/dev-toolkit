export class UnsubscribeUserCommand {
  constructor(
    public readonly userId: string,
    public readonly resourceType?: string,
    public readonly resourceId?: string,
    public readonly subscriptionId?: string,
  ) {}
}
