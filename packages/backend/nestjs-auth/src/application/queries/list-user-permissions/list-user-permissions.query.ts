export class ListUserPermissionsQuery {
  constructor(
    public readonly idpSub: string,
    public readonly activeOnly = true,
  ) {}
}
