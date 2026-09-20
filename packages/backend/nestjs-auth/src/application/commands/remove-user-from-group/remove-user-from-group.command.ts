export class RemoveUserFromGroupCommand {
  constructor(
    public readonly idpSub: string,
    public readonly membershipId: string,
    public readonly revokedBy: string,
  ) {}
}
