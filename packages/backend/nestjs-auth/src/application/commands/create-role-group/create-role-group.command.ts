export class CreateRoleGroupCommand {
  constructor(
    public readonly key: string,
    public readonly description?: string,
  ) {}
}
