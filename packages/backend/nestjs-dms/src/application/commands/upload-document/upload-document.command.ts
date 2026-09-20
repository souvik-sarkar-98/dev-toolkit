export class UploadDocumentCommand {
  constructor(
    readonly fileBuffer: Buffer,
    readonly fileName: string,
    readonly contentType: string,
    readonly mappings: Array<{ entityType: string; entityId: string }>,
    readonly visibility: string,
    readonly userId: string,
    readonly userPermissions: string[],
    /** App profile UUID for per-user storage providers; omit for shared-bucket only. */
    readonly storageOwnerId?: string,
  ) {}
}
