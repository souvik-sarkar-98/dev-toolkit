export class ListDocumentsQuery {
  constructor(
    readonly entityType: string,
    readonly entityId: string,
    readonly userId: string,
    readonly userPermissions: string[],
  ) {}
}
