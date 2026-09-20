import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { FirebaseStorageService } from './firebase-storage.service';
import {
  IStorageProvider,
  StorageUploadParams,
  StorageUploadResult,
} from '../../domain/ports/storage.port';

/**
 * Adapts the internally-owned `FirebaseStorageService` to the DMS2
 * `IStorageProvider` port. This is the only file in the DMS2 module that
 * references Firebase-specific code — everything else depends on the port
 * interface.
 *
 * If the host app selected a different storage provider (e.g. `"google-drive"`)
 * and these methods are somehow called, `FirebaseStorageService` will throw a
 * clear, actionable error because no Firebase app was initialised.
 */
@Injectable()
export class FirebaseStorageAdapter implements IStorageProvider {
  constructor(private readonly firebaseStorage: FirebaseStorageService) {}

  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResult> {
    const url = await this.firebaseStorage.uploadFile(
      params.path,
      params.contentType,
      params.token,
      params.content,
    );
    return { url, remotePath: params.path };
  }

  async deleteFile(remotePath: string): Promise<void> {
    await this.firebaseStorage.deleteFile(remotePath);
  }

  async getSignedUrl(
    remotePath: string,
    _ownerId?: string,
    expireAfter?: number,
  ): Promise<string> {
    return expireAfter === undefined
      ? this.firebaseStorage.getSignedUrl(remotePath)
      : this.firebaseStorage.getSignedUrl(remotePath, expireAfter);
  }

  async downloadFile(remotePath: string): Promise<Readable> {
    return this.firebaseStorage.downloadFile(remotePath);
  }

  // TODO (MEDIUM-2): Implement renameFile for Firebase Storage.
  // Firebase Storage objects are content-addressable; renaming requires copying the object
  // to a new path and deleting the old one. Steps:
  //   1. Download the file bytes (or use the Admin SDK's copy operation if available).
  //   2. Re-upload under the new path / name.
  //   3. Delete the original object.
  //   4. Return the new remotePath (the Document aggregate will also need updating).
  // renameFile(remotePath: string, newName: string, _ownerId?: string): Promise<void> { ... }
}
