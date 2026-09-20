import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SaveFormDraftDto {
  @ApiProperty({ example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    type: Object,
    description: 'Map of field key → raw user-provided value',
    example: { full_name: 'Asha Verma', emergency_contact: '+919876543210' },
  })
  @IsObject()
  values: Record<string, unknown>;
}

export class SubmitFormDto {
  @ApiProperty({ example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({
    type: Object,
    description: 'Optional final values to persist before submit',
    example: { full_name: 'Asha Verma', emergency_contact: '+919876543210' },
  })
  @IsObject()
  @IsOptional()
  values?: Record<string, unknown>;
}

export class ClearFormSubmissionDto {
  @ApiProperty({ example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class FormSubmissionQueryDto {
  @ApiProperty({ format: 'uuid', example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  @IsNotEmpty()
  formId: string;

  @ApiProperty({ example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ format: 'uuid', example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class FormSubmissionHistoryQueryDto extends FormSubmissionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter to a specific field key',
    example: 'emergency_contact',
  })
  @IsString()
  @IsOptional()
  fieldKey?: string;
}

