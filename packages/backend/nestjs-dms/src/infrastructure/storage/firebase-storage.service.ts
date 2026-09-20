import { Inject, Injectable, Optional } from '@nestjs/common';
import { Readable } from 'stream';
import * as admin from 'firebase-admin';
import * as querystring from 'querystring';
import { FIREBASE_ADMIN } from '../firebase-admin.token';

@Injectable()
export class FirebaseStorageService {
  constructor(
    @Optional() @Inject(FIREBASE_ADMIN) private readonly app: admin.app.App | null,
  ) {}

  private get client(): admin.app.App {
    if (!this.app) {
      throw new Error(
        '[DmsModule] Firebase storage is selected but no Firebase credentials were provided. ' +
          'Pass a `firebase` config block to DmsModule.forRoot({ provider: "firebase", firebase: { serviceAccount, ... } }).',
      );
    }
    return this.app;
  }

  async uploadFile(
    filePath: string,
    contentType: string,
    token: string,
    content: Buffer,
  ): Promise<string> {
    const bucket = this.client.storage().bucket();

    try {
      const file = bucket.file(filePath);
      await file.save(content, {
        metadata: {
          contentType,
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });

      const encodedBucket = querystring.escape(bucket.name);
      const encodedFileName = querystring.escape(filePath);
      const encodedToken = querystring.escape(token);

      return `https://firebasestorage.googleapis.com/v0/b/${encodedBucket}/o/${encodedFileName}?alt=media&token=${encodedToken}`;
    } catch (error) {
      throw new Error(`Firebase upload failed: ${(error as Error).message}`);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    const bucket = this.client.storage().bucket();
    const file = bucket.file(fileName);

    try {
      await file.delete();
    } catch (error) {
      throw new Error(`Firebase delete failed: ${(error as Error).message}`);
    }
  }

  async getSignedUrl(
    fileName: string,
    expireAfter: number = 15 * 60 * 1000,
  ): Promise<string> {
    const bucket = this.client.storage().bucket();
    const file = bucket.file(fileName);

    try {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: new Date(Date.now() + expireAfter),
      });
      return url;
    } catch (error) {
      throw new Error(`Firebase getSignedUrl failed: ${(error as Error).message}`);
    }
  }

  async downloadFile(filePath: string): Promise<Readable> {
    const bucket = this.client.storage().bucket();
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('File not found');
    }

    const stream = file.createReadStream();

    stream.on('error', (error) => {
      console.error('Firebase stream error:', error);
      // Error will propagate through the stream to the consumer
    });

    return stream;
  }
}
