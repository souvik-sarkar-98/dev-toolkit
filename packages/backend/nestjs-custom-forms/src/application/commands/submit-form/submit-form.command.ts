export class SubmitFormCommand {
  constructor(
    public readonly formId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly values: Record<string, unknown> | undefined,
    public readonly userId: string,
    public readonly userPermissions: string[],
  ) {}
}
