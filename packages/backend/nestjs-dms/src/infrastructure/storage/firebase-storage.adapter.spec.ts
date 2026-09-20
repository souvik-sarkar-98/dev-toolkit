/**
 * FirebaseStorageAdapter unit tests.
 * Ported from test/dms/firebase-storage.adapter.spec.ts (stale @ssdev-toolkit/nestjs-dms/* imports).
 * The adapter delegates all operations to FirebaseStorageService, which is mocked here.
 */
import 'reflect-metadata';
import { FirebaseStorageAdapter } from './firebase-storage.adapter';

function buildFirebaseStorageMock() {
  return {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn(),
    downloadFile: jest.fn(),
  };
}

describe('FirebaseStorageAdapter', () => {
  describe('uploadFile()', () => {
    it('delegates to FirebaseStorageService and echoes back the same path as remotePath', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      firebaseStorage.uploadFile.mockResolvedValue('https://storage.example/report.pdf');
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      const result = await adapter.uploadFile({
        path: 'uploads/report.pdf',
        contentType: 'application/pdf',
        token: 'token-abc',
        content: Buffer.from('hello'),
      });

      expect(firebaseStorage.uploadFile).toHaveBeenCalledWith(
        'uploads/report.pdf',
        'application/pdf',
        'token-abc',
        Buffer.from('hello'),
      );
      expect(result).toEqual({
        url: 'https://storage.example/report.pdf',
        remotePath: 'uploads/report.pdf',
      });
    });

    it('ignores ownerId (shared-bucket provider does not need it)', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      firebaseStorage.uploadFile.mockResolvedValue('https://storage.example/doc.pdf');
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      await adapter.uploadFile({
        path: 'uploads/doc.pdf',
        contentType: 'application/pdf',
        token: 'tok',
        content: Buffer.from('data'),
        ownerId: 'user-uuid-1',
      });

      expect(firebaseStorage.uploadFile).toHaveBeenCalledWith(
        'uploads/doc.pdf',
        'application/pdf',
        'tok',
        Buffer.from('data'),
      );
    });
  });

  describe('deleteFile()', () => {
    it('delegates to FirebaseStorageService', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      await adapter.deleteFile('uploads/report.pdf');

      expect(firebaseStorage.deleteFile).toHaveBeenCalledWith('uploads/report.pdf');
    });

    it('ignores ownerId (signature accepts remotePath only)', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      // The IStorageProvider interface accepts ownerId, but FirebaseStorageAdapter ignores it
      await (adapter as any).deleteFile('uploads/report.pdf', 'some-sub');

      expect(firebaseStorage.deleteFile).toHaveBeenCalledWith('uploads/report.pdf');
    });
  });

  describe('getSignedUrl()', () => {
    it('delegates to FirebaseStorageService without an expiry when not provided', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      firebaseStorage.getSignedUrl.mockResolvedValue('https://signed.example/report.pdf');
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      const result = await adapter.getSignedUrl('uploads/report.pdf');

      expect(firebaseStorage.getSignedUrl).toHaveBeenCalledWith('uploads/report.pdf');
      expect(result).toBe('https://signed.example/report.pdf');
    });

    it('forwards a custom expiry when provided', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      firebaseStorage.getSignedUrl.mockResolvedValue('https://signed.example/report.pdf');
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      await adapter.getSignedUrl('uploads/report.pdf', undefined, 3600);

      expect(firebaseStorage.getSignedUrl).toHaveBeenCalledWith('uploads/report.pdf', 3600);
    });

    it('ignores _ownerId (shared-bucket provider)', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      firebaseStorage.getSignedUrl.mockResolvedValue('https://signed.example/doc.pdf');
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      await adapter.getSignedUrl('uploads/doc.pdf', 'some-sub', undefined);

      expect(firebaseStorage.getSignedUrl).toHaveBeenCalledWith('uploads/doc.pdf');
    });
  });

  describe('downloadFile()', () => {
    it('delegates to FirebaseStorageService and returns the stream', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      const stream = {} as NodeJS.ReadableStream;
      firebaseStorage.downloadFile.mockResolvedValue(stream);
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      const result = await adapter.downloadFile('uploads/report.pdf');

      expect(firebaseStorage.downloadFile).toHaveBeenCalledWith('uploads/report.pdf');
      expect(result).toBe(stream);
    });
  });

  describe('error propagation', () => {
    it('propagates errors thrown by FirebaseStorageService', async () => {
      const firebaseStorage = buildFirebaseStorageMock();
      firebaseStorage.uploadFile.mockRejectedValue(new Error('Firebase upload failed: network error'));
      const adapter = new FirebaseStorageAdapter(firebaseStorage as any);

      await expect(
        adapter.uploadFile({
          path: 'uploads/report.pdf',
          contentType: 'application/pdf',
          token: 'tok',
          content: Buffer.from('data'),
        }),
      ).rejects.toThrow('Firebase upload failed');
    });
  });
});
