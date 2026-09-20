import { Readable } from 'stream';

export const IStorageProvider = Symbol('IStorageProvider');

export interface StorageUploadParams {
  /** Suggested storage key/path. Adapters that assign their own identifier
   * (e.g. Google Drive file IDs) may ignore this and return a different
   * `remotePath` instead. */
  path: string;
  contentType: string;
  /** Opaque access token used by adapters that support token-based public
   * access (e.g. Firebase Storage download tokens). Ignored by adapters
   * that don't have an equivalent concept. */
  token: string;
  content: Buffer;
  /** App profile UUID (`userId`) for adapters that store files under a
   * specific user's account (e.g. Google Drive, via TokenVaultModule).
   * Shared-bucket providers (e.g. Firebase) ignore this. */
  ownerId?: string;
}

export interface StorageUploadResult {
  /** Publicly reachable (or provider-appropriate) URL for the uploaded file. */
  url: string;
  /** The identifier the adapter actually stored the file under — persist
   * this, not the suggested `path`, since some providers assign their own. */
  remotePath: string;
}

/**
 * Storage backend abstraction for the DMS2 module. Command handlers depend only
 * on this interface — never on a concrete provider — so the storage backend
 * (Firebase Storage, Google Drive, ...) can be swapped via configuration
 * without touching application logic.
 *
 * `ownerId` is the app profile UUID (`userId`) for per-user providers (e.g. Google Drive);
 * shared-bucket providers (e.g. Firebase) ignore it.
 */
export interface IStorageProvider {
  uploadFile(params: StorageUploadParams): Promise<StorageUploadResult>;
  deleteFile(remotePath: string, ownerId?: string): Promise<void>;
  getSignedUrl(
    remotePath: string,
    ownerId?: string,
    expireAfter?: number,
  ): Promise<string>;
  downloadFile(
    remotePath: string,
    ownerId?: string,
  ): Promise<Readable>;
  /**
   * Optional — not all providers support in-place rename.
   * Implementations that do not support rename should omit this method;
   * callers must check for its presence before invoking.
   */
  renameFile?(remotePath: string, newName: string, ownerId?: string): Promise<void>;
}
