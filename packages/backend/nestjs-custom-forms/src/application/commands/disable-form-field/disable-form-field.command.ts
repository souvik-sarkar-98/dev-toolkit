export class DisableFormFieldCommand {
  constructor(
    public readonly formId: string,
    public readonly fieldId: string,
    public readonly userId: string,
    public readonly userPermissions: string[],
  ) {}
}
