export class UpdateFormCommand {
  constructor(
    public readonly formId: string,
    public readonly label: string | undefined,
    public readonly description: string | null | undefined,
    public readonly managePermissions: string[] | undefined,
    public readonly readPermissions: string[] | undefined,
    public readonly writePermissions: string[] | undefined,
    public readonly userId: string,
    public readonly userPermissions: string[],
  ) {}
}
