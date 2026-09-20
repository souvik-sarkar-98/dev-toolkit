export class UpdateRoleCommand {
  constructor(
    public readonly key: string,
    public readonly description?: string,
  ) {}
}
