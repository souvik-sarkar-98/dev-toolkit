import 'reflect-metadata';
import {
  JsonDocumentNotFoundError,
  JsonDocumentKeyNotFoundError,
  JsonDocumentAlreadyExistsError,
  JsonDocumentInvalidError,
} from './json-store.errors';
import { BusinessError } from '@ssdev-toolkit/nestjs-core';

describe('JsonDocumentNotFoundError', () => {
  it('is an instance of BusinessError', () => {
    expect(new JsonDocumentNotFoundError('doc-1')).toBeInstanceOf(BusinessError);
  });

  it('has HTTP status code 404', () => {
    const err = new JsonDocumentNotFoundError('doc-1');

    expect(err.statusCode).toBe(404);
  });

  it('has error code JSON_DOCUMENT_NOT_FOUND', () => {
    const err = new JsonDocumentNotFoundError('doc-1');

    expect(err.errorCode).toBe('JSON_DOCUMENT_NOT_FOUND');
  });

  it('message includes the document id', () => {
    const err = new JsonDocumentNotFoundError('abc-123');

    expect(err.message).toContain('abc-123');
  });
});

describe('JsonDocumentKeyNotFoundError', () => {
  it('is an instance of BusinessError', () => {
    expect(new JsonDocumentKeyNotFoundError('my-key', 'ns')).toBeInstanceOf(BusinessError);
  });

  it('has HTTP status code 404', () => {
    const err = new JsonDocumentKeyNotFoundError('my-key', 'ns');

    expect(err.statusCode).toBe(404);
  });

  it('has error code JSON_DOCUMENT_KEY_NOT_FOUND', () => {
    const err = new JsonDocumentKeyNotFoundError('my-key', 'ns');

    expect(err.errorCode).toBe('JSON_DOCUMENT_KEY_NOT_FOUND');
  });

  it('message includes the key and namespace', () => {
    const err = new JsonDocumentKeyNotFoundError('welcome-email', 'correspondence');

    expect(err.message).toContain('welcome-email');
    expect(err.message).toContain('correspondence');
  });
});

describe('JsonDocumentAlreadyExistsError', () => {
  it('is an instance of BusinessError', () => {
    expect(new JsonDocumentAlreadyExistsError('key', 'ns')).toBeInstanceOf(BusinessError);
  });

  it('has HTTP status code 409', () => {
    const err = new JsonDocumentAlreadyExistsError('key', 'ns');

    expect(err.statusCode).toBe(409);
  });

  it('has error code JSON_DOCUMENT_ALREADY_EXISTS', () => {
    const err = new JsonDocumentAlreadyExistsError('key', 'ns');

    expect(err.errorCode).toBe('JSON_DOCUMENT_ALREADY_EXISTS');
  });

  it('message includes the key and namespace', () => {
    const err = new JsonDocumentAlreadyExistsError('invoice-template', 'billing');

    expect(err.message).toContain('invoice-template');
    expect(err.message).toContain('billing');
  });
});

describe('JsonDocumentInvalidError', () => {
  it('is an instance of BusinessError', () => {
    expect(new JsonDocumentInvalidError('key must not be empty')).toBeInstanceOf(BusinessError);
  });

  it('has HTTP status code 400', () => {
    const err = new JsonDocumentInvalidError('key must not be empty');

    expect(err.statusCode).toBe(400);
  });

  it('has error code JSON_DOCUMENT_INVALID', () => {
    const err = new JsonDocumentInvalidError('key must not be empty');

    expect(err.errorCode).toBe('JSON_DOCUMENT_INVALID');
  });

  it('message reflects the reason passed to the constructor', () => {
    const reason = 'namespace must not be empty';
    const err = new JsonDocumentInvalidError(reason);

    expect(err.message).toBe(reason);
  });
});
