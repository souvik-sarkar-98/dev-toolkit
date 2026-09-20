export class BulkUpdateFieldSortOrderCommand {
  constructor(
    public readonly formId: string,
    public readonly items: Array<{ id: string; sortOrder: number }>,
    public readonly userId: string,
    public readonly userPermissions: string[],
  ) {}
}
