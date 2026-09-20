export class DisableFormCommand {
  constructor(
    public readonly formId: string,
    public readonly userId: string,
    public readonly userPermissions: string[],
  ) {}
}
