export class RevokeUserPermissionCommand {
  constructor(
    public readonly idpSub: string,
    public readonly userPermissionId: string,
    public readonly revokedBy: string,
  ) {}
}
