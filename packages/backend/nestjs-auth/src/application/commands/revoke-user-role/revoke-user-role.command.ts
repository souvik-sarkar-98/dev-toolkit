export class RevokeUserRoleCommand {
  constructor(
    public readonly idpSub: string,
    public readonly userRoleId: string,
    public readonly revokedBy: string,
  ) {}
}
