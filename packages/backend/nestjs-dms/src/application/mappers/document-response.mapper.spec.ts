import 'reflect-metadata';
import { DocumentResponseMapper } from './document-response.mapper';
import { Document } from '../../domain/aggregates/document.aggregate';
import { DocumentMapping } from '../../domain/entities/document-mapping.entity';
import { DocumentVisibility } from '../../domain/enums/document-visibility.enum';
import { DocumentResponseDto } from '../../presentation/dtos/document-response.dto';

function buildDocument(overrides: {
  visibility?: DocumentVisibility;
  uploadedById?: string;
  mappings?: DocumentMapping[];
} = {}): Document {
  return Document.create({
    fileName: 'report.pdf',
    contentType: 'application/pdf',
    fileSize: 2048,
    remotePath: 'uploads/report.pdf',
    publicToken: 'token-abc',
    mappedTo: overrides.mappings ?? [
      DocumentMapping.create({ refId: 'entity-1', refType: 'donation' }),
    ],
    visibility: overrides.visibility ?? DocumentVisibility.Private,
    uploadedById: overrides.uploadedById ?? 'user-1',
  });
}

describe('DocumentResponseMapper', () => {
  describe('toDto()', () => {
    it('returns a DocumentResponseDto instance', () => {
      const doc = buildDocument();
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto).toBeInstanceOf(DocumentResponseDto);
    });

    it('maps scalar fields correctly', () => {
      const doc = buildDocument();
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto.id).toBe(doc.id);
      expect(dto.fileName).toBe('report.pdf');
      expect(dto.contentType).toBe('application/pdf');
      expect(dto.fileSize).toBe(2048);
      expect(dto.visibility).toBe(DocumentVisibility.Private);
      expect(dto.uploadedById).toBe('user-1');
    });

    it('maps mappings as DocumentMappingDto entries', () => {
      const mapping = DocumentMapping.create({ refId: 'entity-1', refType: 'donation' });
      const doc = buildDocument({ mappings: [mapping] });
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto.mappings).toHaveLength(1);
      expect(dto.mappings[0].id).toBe(mapping.id);
      expect(dto.mappings[0].entityId).toBe('entity-1');
      expect(dto.mappings[0].entityType).toBe('donation');
    });

    it('maps multiple mappings', () => {
      const mappings = [
        DocumentMapping.create({ refId: 'entity-1', refType: 'donation' }),
        DocumentMapping.create({ refId: 'entity-2', refType: 'project' }),
      ];
      const doc = buildDocument({ mappings });
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto.mappings).toHaveLength(2);
    });

    it('maps uploadedAt from document.createdAt', () => {
      const doc = buildDocument();
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto.uploadedAt).toEqual(doc.createdAt);
    });

    it('maps deletedAt as undefined on a non-deleted document', () => {
      const doc = buildDocument();
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto.deletedAt).toBeUndefined();
    });

    it('maps deletedAt when the document has been soft-deleted', () => {
      const doc = buildDocument();
      doc.softDelete();
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto.deletedAt).toBeDefined();
      expect(dto.deletedAt).toEqual(doc.deletedAt);
    });

    it('maps visibility PUBLIC when document is public', () => {
      const doc = buildDocument({ visibility: DocumentVisibility.Public });
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto.visibility).toBe(DocumentVisibility.Public);
    });

    it('maps uploadedById as undefined when not provided', () => {
      const doc = Document.create({
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
        remotePath: 'uploads/report.pdf',
        publicToken: 'token-abc',
        mappedTo: [],
        visibility: DocumentVisibility.Private,
      });
      const dto = DocumentResponseMapper.toDto(doc);

      expect(dto.uploadedById).toBeUndefined();
    });
  });

  describe('toDtoList()', () => {
    it('returns an empty array for an empty list', () => {
      expect(DocumentResponseMapper.toDtoList([])).toEqual([]);
    });

    it('maps every document in the list', () => {
      const docs = [buildDocument(), buildDocument()];
      const dtos = DocumentResponseMapper.toDtoList(docs);

      expect(dtos).toHaveLength(2);
      dtos.forEach((dto) => expect(dto).toBeInstanceOf(DocumentResponseDto));
    });
  });
});
