export class UpdateApiKeyPermissionsCommand {
  constructor(
    public readonly apiKeyId: string,
    public readonly permissions: string[],
    public readonly callerPermissions: string[],
  ) {}
}
