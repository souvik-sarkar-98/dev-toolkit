export class ListUserRolesQuery {
  constructor(
    public readonly idpSub: string,
    public readonly activeOnly = true,
  ) {}
}
