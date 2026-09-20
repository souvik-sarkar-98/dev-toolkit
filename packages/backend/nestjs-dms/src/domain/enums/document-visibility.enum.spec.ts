import 'reflect-metadata';
import { DocumentVisibility } from './document-visibility.enum';
import { Document } from '../aggregates/document.aggregate';

describe('DocumentVisibility enum', () => {
  it('Public value is the string PUBLIC', () => {
    expect(DocumentVisibility.Public).toBe('PUBLIC');
  });

  it('Private value is the string PRIVATE', () => {
    expect(DocumentVisibility.Private).toBe('PRIVATE');
  });

  it('has exactly two members', () => {
    const values = Object.values(DocumentVisibility);

    expect(values).toHaveLength(2);
    expect(values).toContain('PUBLIC');
    expect(values).toContain('PRIVATE');
  });

  describe('Document.isPublic derived from visibility', () => {
    it('isPublic is true for Public visibility — skips signed URL flow', () => {
      const doc = Document.create({
        fileName: 'doc.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
        remotePath: 'uploads/doc.pdf',
        publicToken: 'token-xyz',
        mappedTo: [],
        visibility: DocumentVisibility.Public,
      });

      expect(doc.isPublic).toBe(true);
    });

    it('isPublic is false for Private visibility — triggers signed URL generation', () => {
      const doc = Document.create({
        fileName: 'doc.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
        remotePath: 'uploads/doc.pdf',
        publicToken: 'token-xyz',
        mappedTo: [],
        visibility: DocumentVisibility.Private,
      });

      expect(doc.isPublic).toBe(false);
    });
  });
});
