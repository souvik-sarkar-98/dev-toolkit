export class GetResourceSubscribersQuery {
  constructor(
    public readonly resourceType: string,
    public readonly resourceId?: string,
  ) {}
}
