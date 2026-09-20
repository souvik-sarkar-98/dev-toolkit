import { JsonDocument } from '../../domain/aggregates/json-document.aggregate';
import { JsonDocumentResponseDto } from '../dtos/json-document.dtos';

export class JsonDocumentResponseMapper {
  static toDto(document: JsonDocument): JsonDocumentResponseDto {
    return {
      id: document.id,
      key: document.key,
      namespace: document.namespace,
      payload: document.payload,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
