export class ClearFormSubmissionCommand {
  constructor(
    public readonly formId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly userId: string,
    public readonly userPermissions: string[],
  ) {}
}
