import 'reflect-metadata';
import { BusinessError } from '@ssdev-toolkit/nestjs-core';
import {
  DocumentNotFoundError,
  DocumentAccessDeniedError,
  EntityTypeForbiddenError,
  FileSizeExceededError,
  MimeTypeNotAllowedError,
  DocumentLimitReachedError,
} from './document.errors';

describe('Document domain errors', () => {
  describe('DocumentNotFoundError', () => {
    it('extends BusinessError', () => {
      expect(new DocumentNotFoundError('doc-1')).toBeInstanceOf(BusinessError);
    });

    it('has statusCode 404', () => {
      const error = new DocumentNotFoundError('doc-1');

      expect(error.statusCode).toBe(404);
    });

    it('errorCode is DOCUMENT_NOT_FOUND', () => {
      const error = new DocumentNotFoundError('doc-1');

      expect(error.errorCode).toBe('DOCUMENT_NOT_FOUND');
    });

    it('message references the document id', () => {
      const error = new DocumentNotFoundError('doc-abc');

      expect(error.message).toContain('doc-abc');
    });
  });

  describe('DocumentAccessDeniedError', () => {
    it('extends BusinessError', () => {
      expect(new DocumentAccessDeniedError('write', 'donation')).toBeInstanceOf(BusinessError);
    });

    it('has statusCode 403', () => {
      const error = new DocumentAccessDeniedError('read', 'donation');

      expect(error.statusCode).toBe(403);
    });

    it('errorCode is DOCUMENT_ACCESS_DENIED', () => {
      const error = new DocumentAccessDeniedError('write', 'donation');

      expect(error.errorCode).toBe('DOCUMENT_ACCESS_DENIED');
    });

    it('message includes action and entityType', () => {
      const error = new DocumentAccessDeniedError('read', 'donation');

      expect(error.message).toContain('read');
      expect(error.message).toContain('donation');
    });

    it('message includes entityId when provided', () => {
      const error = new DocumentAccessDeniedError('read', 'donation', 'entity-1');

      expect(error.message).toContain('entity-1');
    });
  });

  describe('EntityTypeForbiddenError', () => {
    it('extends BusinessError', () => {
      expect(new EntityTypeForbiddenError('invoice')).toBeInstanceOf(BusinessError);
    });

    it('has statusCode 403', () => {
      const error = new EntityTypeForbiddenError('invoice');

      expect(error.statusCode).toBe(403);
    });

    it('errorCode is DOCUMENT_ENTITY_TYPE_FORBIDDEN', () => {
      const error = new EntityTypeForbiddenError('invoice');

      expect(error.errorCode).toBe('DOCUMENT_ENTITY_TYPE_FORBIDDEN');
    });

    it('message references the forbidden entityType', () => {
      const error = new EntityTypeForbiddenError('invoice');

      expect(error.message).toContain('invoice');
    });
  });

  describe('FileSizeExceededError', () => {
    it('extends BusinessError', () => {
      expect(new FileSizeExceededError(50)).toBeInstanceOf(BusinessError);
    });

    it('has statusCode 400', () => {
      const error = new FileSizeExceededError(50);

      expect(error.statusCode).toBe(400);
    });

    it('errorCode is FILE_SIZE_EXCEEDED', () => {
      const error = new FileSizeExceededError(50);

      expect(error.errorCode).toBe('FILE_SIZE_EXCEEDED');
    });

    it('message references the max allowed size', () => {
      const error = new FileSizeExceededError(25);

      expect(error.message).toContain('25 MB');
    });
  });

  describe('MimeTypeNotAllowedError', () => {
    it('extends BusinessError', () => {
      expect(new MimeTypeNotAllowedError('video/mp4')).toBeInstanceOf(BusinessError);
    });

    it('has statusCode 400', () => {
      const error = new MimeTypeNotAllowedError('video/mp4');

      expect(error.statusCode).toBe(400);
    });

    it('errorCode is MIME_TYPE_NOT_ALLOWED', () => {
      const error = new MimeTypeNotAllowedError('video/mp4');

      expect(error.errorCode).toBe('MIME_TYPE_NOT_ALLOWED');
    });

    it('message references the disallowed content type', () => {
      const error = new MimeTypeNotAllowedError('video/mp4');

      expect(error.message).toContain('video/mp4');
    });
  });

  describe('DocumentLimitReachedError', () => {
    it('extends BusinessError', () => {
      expect(new DocumentLimitReachedError('donation', 'entity-1', 5)).toBeInstanceOf(BusinessError);
    });

    it('has statusCode 400', () => {
      const error = new DocumentLimitReachedError('donation', 'entity-1', 5);

      expect(error.statusCode).toBe(400);
    });

    it('errorCode is DOCUMENT_LIMIT_REACHED', () => {
      const error = new DocumentLimitReachedError('donation', 'entity-1', 5);

      expect(error.errorCode).toBe('DOCUMENT_LIMIT_REACHED');
    });

    it('message references entityType, entityId, and limit', () => {
      const error = new DocumentLimitReachedError('donation', 'entity-abc', 3);

      expect(error.message).toContain('donation/entity-abc');
      expect(error.message).toContain('3');
    });
  });
});
