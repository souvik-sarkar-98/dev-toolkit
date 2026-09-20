export class RenameDocumentCommand {
  constructor(
    readonly documentId: string,
    readonly newName: string,
    readonly userId: string,
    readonly userPermissions: string[],
  ) {}
}
