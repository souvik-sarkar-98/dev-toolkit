export class UpdatePermissionCommand {
  constructor(
    public readonly key: string,
    public readonly description?: string,
  ) {}
}
