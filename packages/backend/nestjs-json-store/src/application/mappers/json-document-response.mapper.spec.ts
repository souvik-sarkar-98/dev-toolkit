import 'reflect-metadata';
import { JsonDocument } from '../../domain/aggregates/json-document.aggregate';
import { JsonDocumentResponseMapper } from './json-document-response.mapper';
import { JsonDocumentResponseDto } from '../dtos/json-document.dtos';

function makeDoc(payload: Record<string, unknown> = { subject: 'Hi' }): JsonDocument {
  return new JsonDocument(
    'doc-uuid-1',
    'welcome-email',
    'correspondence',
    payload,
    new Date('2026-01-01T00:00:00Z'),
    new Date('2026-06-01T00:00:00Z'),
  );
}

describe('JsonDocumentResponseMapper.toDto()', () => {
  it('maps id correctly', () => {
    const dto = JsonDocumentResponseMapper.toDto(makeDoc());

    expect(dto.id).toBe('doc-uuid-1');
  });

  it('maps key correctly', () => {
    const dto = JsonDocumentResponseMapper.toDto(makeDoc());

    expect(dto.key).toBe('welcome-email');
  });

  it('maps namespace correctly', () => {
    const dto = JsonDocumentResponseMapper.toDto(makeDoc());

    expect(dto.namespace).toBe('correspondence');
  });

  it('maps payload correctly', () => {
    const doc = makeDoc({ subject: 'Hello', body: 'World' });
    const dto = JsonDocumentResponseMapper.toDto(doc);

    expect(dto.payload).toEqual({ subject: 'Hello', body: 'World' });
  });

  it('maps createdAt correctly', () => {
    const dto = JsonDocumentResponseMapper.toDto(makeDoc());

    expect(dto.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  it('maps updatedAt correctly', () => {
    const dto = JsonDocumentResponseMapper.toDto(makeDoc());

    expect(dto.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
  });

  it('returns a plain object conforming to JsonDocumentResponseDto shape', () => {
    const dto = JsonDocumentResponseMapper.toDto(makeDoc());

    const expected: JsonDocumentResponseDto = {
      id: 'doc-uuid-1',
      key: 'welcome-email',
      namespace: 'correspondence',
      payload: { subject: 'Hi' },
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    };

    expect(dto).toEqual(expected);
  });

  it('payload is the defensive copy from the aggregate (not a live reference)', () => {
    const originalPayload = { name: 'original' };
    const doc = makeDoc(originalPayload);

    const dto = JsonDocumentResponseMapper.toDto(doc);
    dto.payload['name'] = 'tampered';

    expect(doc.payload['name']).toBe('original');
  });
});
