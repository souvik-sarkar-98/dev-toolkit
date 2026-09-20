/**
 * Minimal interface for optional record-level access ports used by
 * comment, dms, and custom-fields. Adapters registered on module-specific
 * DI tokens (e.g. ICommentEntityAccessPort, IDocumentEntityAccessPort, ICustomFormEntityAccessPort)
 * implement this shape.
 */
export interface IEntityAccessPort {
  canAccess(params: {
    entityType: string;
    entityId?: string;
    userId: string;
    userPermissions: string[];
    action: string;
  }): Promise<boolean>;
}
