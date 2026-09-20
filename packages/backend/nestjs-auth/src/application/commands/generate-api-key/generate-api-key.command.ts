export class GenerateApiKeyCommand {
  constructor(
    public readonly name: string,
    public readonly permissions: string[],
    public readonly callerPermissions: string[],
    public readonly createdBy: string,
    public readonly expiresAt?: Date,
    public readonly ownerId?: string,
  ) {}
}
