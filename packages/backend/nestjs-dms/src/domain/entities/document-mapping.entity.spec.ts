import 'reflect-metadata';
import { DocumentMapping } from './document-mapping.entity';

describe('DocumentMapping entity', () => {
  describe('create()', () => {
    it('returns a DocumentMapping with refId and refType set', () => {
      const mapping = DocumentMapping.create({ refId: 'entity-1', refType: 'donation' });

      expect(mapping).toBeInstanceOf(DocumentMapping);
      expect(mapping.refId).toBe('entity-1');
      expect(mapping.refType).toBe('donation');
    });

    it('assigns a unique UUID id', () => {
      const m1 = DocumentMapping.create({ refId: 'entity-1', refType: 'donation' });
      const m2 = DocumentMapping.create({ refId: 'entity-1', refType: 'donation' });

      expect(m1.id).toBeTruthy();
      expect(m2.id).toBeTruthy();
      expect(m1.id).not.toBe(m2.id);
    });

    it('can be created with different entity types', () => {
      const donationMapping = DocumentMapping.create({ refId: 'don-1', refType: 'donation' });
      const projectMapping = DocumentMapping.create({ refId: 'proj-1', refType: 'project' });

      expect(donationMapping.refType).toBe('donation');
      expect(projectMapping.refType).toBe('project');
    });
  });

  describe('constructor (direct instantiation for repository use)', () => {
    it('preserves id, refId, refType, and timestamps', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-01');
      const mapping = new DocumentMapping('fixed-id', 'entity-5', 'invoice', createdAt, updatedAt);

      expect(mapping.id).toBe('fixed-id');
      expect(mapping.refId).toBe('entity-5');
      expect(mapping.refType).toBe('invoice');
      expect(mapping.createdAt).toEqual(createdAt);
      expect(mapping.updatedAt).toEqual(updatedAt);
    });
  });
});
