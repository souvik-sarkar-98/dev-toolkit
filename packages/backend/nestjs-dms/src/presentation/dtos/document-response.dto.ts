import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessGatedResponse } from '@ssdev-toolkit/nestjs-core';

export class DocumentMappingDto {
  @ApiProperty({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  id: string;

  @ApiProperty({ example: 'PROJECT' })
  entityType: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  entityId: string;
}

export class DocumentResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  id: string;

  @ApiProperty({ example: 'vendor-invoice-2026-0117.pdf' })
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  contentType: string;

  @ApiProperty({ example: 284736 })
  fileSize: number;

  /** DocumentVisibility value: 'PUBLIC' | 'PRIVATE' */
  @ApiProperty({ example: 'PRIVATE' })
  visibility: string;

  @ApiPropertyOptional({ example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  uploadedById?: string;

  @ApiProperty({ type: [DocumentMappingDto] })
  mappings: DocumentMappingDto[];

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  uploadedAt: Date;

  @ApiPropertyOptional({ example: '2026-03-14T09:30:00.000Z' })
  updatedAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-14T09:30:00.000Z' })
  deletedAt?: Date;
}

export class ListDocumentsResponseDto extends AccessGatedResponse<DocumentResponseDto> {
  @ApiProperty({ type: [DocumentResponseDto] })
  declare data: DocumentResponseDto[];
}
