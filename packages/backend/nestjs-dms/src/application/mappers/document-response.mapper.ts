import { Document } from '../../domain/aggregates/document.aggregate';
import { DocumentMappingDto, DocumentResponseDto } from '../../presentation/dtos/document-response.dto';

export class DocumentResponseMapper {
  static toDto(document: Document): DocumentResponseDto {
    const mappings: DocumentMappingDto[] = document.mappings.map((m) => ({
      id: m.id,
      entityType: m.refType,
      entityId: m.refId,
    }));

    const dto = new DocumentResponseDto();
    dto.id = document.id;
    dto.fileName = document.fileName;
    dto.contentType = document.contentType;
    dto.fileSize = document.fileSize;
    dto.visibility = document.visibility;
    dto.uploadedById = document.uploadedById;
    dto.mappings = mappings;
    dto.uploadedAt = document.createdAt;
    dto.updatedAt = document.updatedAt;
    dto.deletedAt = document.deletedAt;
    return dto;
  }

  static toDtoList(documents: Document[]): DocumentResponseDto[] {
    return documents.map((d) => DocumentResponseMapper.toDto(d));
  }
}
