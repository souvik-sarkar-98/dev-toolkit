import {
  DocumentLimitReachedError,
  FileSizeExceededError,
  MimeTypeNotAllowedError,
} from '../errors/document.errors';

/**
 * Pure, synchronous domain policy for upload validation — no I/O, no NestJS imports.
 * Extracted from application-layer logic so it can be tested without infrastructure.
 */
export class DocumentUploadPolicy {
  /**
   * Throws FileSizeExceededError if the file exceeds the configured maximum.
   */
  static assertSizeAllowed(fileSize: number, maxFileSizeMb: number): void {
    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (fileSize > maxBytes) {
      throw new FileSizeExceededError(maxFileSizeMb);
    }
  }

  /**
   * Throws MimeTypeNotAllowedError if the content type is not in the allowlist.
   * Supports wildcards: a trailing slash-star (e.g. "image/star") matches any subtype;
   * "star/star" matches everything. When allowedMimeTypes is empty or undefined,
   * all content types are permitted.
   */
  static assertMimeAllowed(contentType: string, allowedMimeTypes?: string[]): void {
    if (!allowedMimeTypes?.length) return;

    const [incomingType, incomingSubtype] = contentType.split('/');

    const isAllowed = allowedMimeTypes.some((allowed) => {
      if (allowed === '*/*') return true;
      const [allowedType, allowedSubtype] = allowed.split('/');
      if (allowedType !== incomingType) return false;
      return allowedSubtype === '*' || allowedSubtype === incomingSubtype;
    });

    if (!isAllowed) {
      throw new MimeTypeNotAllowedError(contentType);
    }
  }

  /**
   * Throws DocumentLimitReachedError if the current document count meets or
   * exceeds the per-entity maximum. No-ops when no limit is configured.
   */
  static assertLimitNotReached(
    currentCount: number,
    entityType: string,
    entityId: string,
    maxDocumentsPerEntity?: number,
  ): void {
    if (maxDocumentsPerEntity === undefined) return;
    if (currentCount >= maxDocumentsPerEntity) {
      throw new DocumentLimitReachedError(entityType, entityId, maxDocumentsPerEntity);
    }
  }
}
