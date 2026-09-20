export class GetUserSubscriptionsQuery {
  constructor(
    public readonly userId: string,
    public readonly resourceType?: string,
    public readonly resourceId?: string,
  ) {}
}
