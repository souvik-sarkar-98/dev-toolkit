export class DeleteDocumentCommand {
  constructor(
    readonly documentId: string,
    readonly userId: string,
    readonly userPermissions: string[],
  ) {}
}
