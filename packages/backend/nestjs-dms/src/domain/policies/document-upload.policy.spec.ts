import 'reflect-metadata';
import { DocumentUploadPolicy } from './document-upload.policy';
import {
  DocumentLimitReachedError,
  FileSizeExceededError,
  MimeTypeNotAllowedError,
} from '../errors/document.errors';

describe('DocumentUploadPolicy', () => {
  describe('assertSizeAllowed()', () => {
    it('does not throw when file size is within the allowed limit', () => {
      const maxMb = 10;
      const fileSize = 5 * 1024 * 1024; // 5 MB

      expect(() => DocumentUploadPolicy.assertSizeAllowed(fileSize, maxMb)).not.toThrow();
    });

    it('does not throw when file size exactly equals the limit', () => {
      const maxMb = 10;
      const fileSize = 10 * 1024 * 1024; // exactly 10 MB

      expect(() => DocumentUploadPolicy.assertSizeAllowed(fileSize, maxMb)).not.toThrow();
    });

    it('throws FileSizeExceededError when file size exceeds the limit', () => {
      const maxMb = 5;
      const fileSize = 6 * 1024 * 1024; // 6 MB

      expect(() => DocumentUploadPolicy.assertSizeAllowed(fileSize, maxMb)).toThrow(
        FileSizeExceededError,
      );
    });

    it('thrown error message references the max size in MB', () => {
      expect(() => DocumentUploadPolicy.assertSizeAllowed(100 * 1024 * 1024, 50)).toThrow(
        '50 MB',
      );
    });
  });

  describe('assertMimeAllowed()', () => {
    it('allows any content type when allowedMimeTypes is undefined', () => {
      expect(() =>
        DocumentUploadPolicy.assertMimeAllowed('video/mp4', undefined),
      ).not.toThrow();
    });

    it('allows any content type when allowedMimeTypes is empty array', () => {
      expect(() => DocumentUploadPolicy.assertMimeAllowed('video/mp4', [])).not.toThrow();
    });

    it('allows an exact MIME type match', () => {
      expect(() =>
        DocumentUploadPolicy.assertMimeAllowed('application/pdf', ['application/pdf']),
      ).not.toThrow();
    });

    it('allows a type matching a wildcard subtype (image/*)', () => {
      expect(() =>
        DocumentUploadPolicy.assertMimeAllowed('image/png', ['image/*']),
      ).not.toThrow();

      expect(() =>
        DocumentUploadPolicy.assertMimeAllowed('image/jpeg', ['image/*']),
      ).not.toThrow();
    });

    it('allows any type when */* is in the list', () => {
      expect(() =>
        DocumentUploadPolicy.assertMimeAllowed('video/mp4', ['*/*']),
      ).not.toThrow();
    });

    it('throws MimeTypeNotAllowedError for disallowed content type', () => {
      expect(() =>
        DocumentUploadPolicy.assertMimeAllowed('video/mp4', ['application/pdf', 'image/*']),
      ).toThrow(MimeTypeNotAllowedError);
    });

    it('wildcard image/* does not match application/pdf', () => {
      expect(() =>
        DocumentUploadPolicy.assertMimeAllowed('application/pdf', ['image/*']),
      ).toThrow(MimeTypeNotAllowedError);
    });
  });

  describe('assertLimitNotReached()', () => {
    it('does not throw when no limit is configured', () => {
      expect(() =>
        DocumentUploadPolicy.assertLimitNotReached(100, 'donation', 'entity-1', undefined),
      ).not.toThrow();
    });

    it('does not throw when current count is below the limit', () => {
      expect(() =>
        DocumentUploadPolicy.assertLimitNotReached(4, 'donation', 'entity-1', 5),
      ).not.toThrow();
    });

    it('throws DocumentLimitReachedError when current count equals the limit', () => {
      expect(() =>
        DocumentUploadPolicy.assertLimitNotReached(5, 'donation', 'entity-1', 5),
      ).toThrow(DocumentLimitReachedError);
    });

    it('throws DocumentLimitReachedError when current count exceeds the limit', () => {
      expect(() =>
        DocumentUploadPolicy.assertLimitNotReached(6, 'donation', 'entity-1', 5),
      ).toThrow(DocumentLimitReachedError);
    });

    it('thrown error references entityType, entityId, and limit', () => {
      expect(() =>
        DocumentUploadPolicy.assertLimitNotReached(3, 'donation', 'entity-abc', 3),
      ).toThrow('donation/entity-abc');
    });
  });
});
