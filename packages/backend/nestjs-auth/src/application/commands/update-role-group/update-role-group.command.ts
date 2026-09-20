export class UpdateRoleGroupCommand {
  constructor(
    public readonly key: string,
    public readonly description?: string,
  ) {}
}
