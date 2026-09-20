import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBase64,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DocumentVisibility } from '../../domain/enums/document-visibility.enum';

export class DocumentMappingRequestDto {
  @ApiProperty({ example: 'PROJECT' })
  @IsNotEmpty()
  @IsString()
  entityType: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsNotEmpty()
  @IsString()
  entityId: string;
}

export class UploadDocumentRequestDto {
  @ApiProperty({
    description: 'Base64-encoded file content',
    example: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c+PgplbmRvYmoK',
  })
  @IsNotEmpty()
  @IsBase64()
  fileBase64: string;

  @ApiProperty({ description: 'Original file name, e.g. report.pdf', example: 'vendor-invoice-2026-0117.pdf' })
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'MIME type, e.g. application/pdf', example: 'application/pdf' })
  @IsNotEmpty()
  @IsString()
  contentType: string;

  @ApiProperty({ type: [DocumentMappingRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentMappingRequestDto)
  mappings: DocumentMappingRequestDto[];

  @ApiPropertyOptional({
    enum: DocumentVisibility,
    default: DocumentVisibility.Private,
    example: DocumentVisibility.Private,
  })
  @IsOptional()
  @IsEnum(DocumentVisibility)
  visibility?: DocumentVisibility;
}
