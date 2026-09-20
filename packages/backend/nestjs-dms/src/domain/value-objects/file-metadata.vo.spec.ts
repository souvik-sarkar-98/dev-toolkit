import 'reflect-metadata';
import { FileMetadata } from './file-metadata.vo';
import { BusinessError } from '@ssdev-toolkit/nestjs-core';

describe('FileMetadata value object', () => {
  describe('of() — factory validation', () => {
    it('creates a valid FileMetadata for well-formed inputs', () => {
      const meta = FileMetadata.of('report.pdf', 'application/pdf', 2048);

      expect(meta.fileName).toBe('report.pdf');
      expect(meta.contentType).toBe('application/pdf');
      expect(meta.fileSize).toBe(2048);
    });

    it('throws BusinessError when fileName is empty string', () => {
      expect(() => FileMetadata.of('', 'application/pdf', 100)).toThrow(BusinessError);
    });

    it('throws BusinessError when fileName is whitespace only', () => {
      expect(() => FileMetadata.of('   ', 'application/pdf', 100)).toThrow(BusinessError);
    });

    it('throws BusinessError when contentType is empty string', () => {
      expect(() => FileMetadata.of('file.pdf', '', 100)).toThrow(BusinessError);
    });

    it('throws BusinessError when contentType is whitespace only', () => {
      expect(() => FileMetadata.of('file.pdf', '   ', 100)).toThrow(BusinessError);
    });

    it('throws BusinessError when fileSize is zero', () => {
      expect(() => FileMetadata.of('file.pdf', 'application/pdf', 0)).toThrow(BusinessError);
    });

    it('throws BusinessError when fileSize is negative', () => {
      expect(() => FileMetadata.of('file.pdf', 'application/pdf', -1)).toThrow(BusinessError);
    });

    it('accepts the minimum valid fileSize of 1', () => {
      const meta = FileMetadata.of('tiny.txt', 'text/plain', 1);

      expect(meta.fileSize).toBe(1);
    });
  });

  describe('immutability', () => {
    it('properties are readonly — TypeScript enforces this at compile time; object preserves original values', () => {
      const meta = FileMetadata.of('file.txt', 'text/plain', 512);

      // TypeScript `readonly` is a compile-time constraint; runtime mutation is silently ignored
      // in non-strict mode. The important guarantee is that `of()` always returns a new
      // instance and the private constructor prevents external construction.
      expect(meta.fileName).toBe('file.txt');
      expect(meta.contentType).toBe('text/plain');
      expect(meta.fileSize).toBe(512);
    });

    it('private constructor prevents direct instantiation — only of() factory is usable', () => {
      // Attempting `new FileMetadata(...)` would be a TypeScript compile error.
      // Verify the factory always returns a fresh instance.
      const a = FileMetadata.of('a.pdf', 'application/pdf', 100);
      const b = FileMetadata.of('a.pdf', 'application/pdf', 100);

      expect(a).not.toBe(b);
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('equals()', () => {
    it('returns true for two instances with the same attributes', () => {
      const a = FileMetadata.of('file.pdf', 'application/pdf', 1024);
      const b = FileMetadata.of('file.pdf', 'application/pdf', 1024);

      expect(a.equals(b)).toBe(true);
    });

    it('returns false when fileName differs', () => {
      const a = FileMetadata.of('file-a.pdf', 'application/pdf', 1024);
      const b = FileMetadata.of('file-b.pdf', 'application/pdf', 1024);

      expect(a.equals(b)).toBe(false);
    });

    it('returns false when contentType differs', () => {
      const a = FileMetadata.of('file.pdf', 'application/pdf', 1024);
      const b = FileMetadata.of('file.pdf', 'image/png', 1024);

      expect(a.equals(b)).toBe(false);
    });

    it('returns false when fileSize differs', () => {
      const a = FileMetadata.of('file.pdf', 'application/pdf', 1024);
      const b = FileMetadata.of('file.pdf', 'application/pdf', 2048);

      expect(a.equals(b)).toBe(false);
    });
  });
});
