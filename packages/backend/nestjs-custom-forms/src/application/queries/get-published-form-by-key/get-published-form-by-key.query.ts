export class GetPublishedFormByKeyQuery {
  constructor(
    public readonly entityType: string,
    public readonly key: string,
    public readonly userPermissions: string[] = [],
    public readonly userId: string = '',
  ) {}
}
