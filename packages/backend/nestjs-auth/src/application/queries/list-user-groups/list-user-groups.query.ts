export class ListUserGroupsQuery {
  constructor(
    public readonly idpSub: string,
    public readonly activeOnly = true,
  ) {}
}
