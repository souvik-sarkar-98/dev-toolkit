export class CreateFormCommand {
  constructor(
    public readonly entityType: string,
    public readonly key: string,
    public readonly label: string,
    public readonly description: string | null,
    public readonly managePermissions: string[],
    public readonly readPermissions: string[],
    public readonly writePermissions: string[],
    public readonly userId: string,
    public readonly userPermissions: string[],
  ) {}
}
