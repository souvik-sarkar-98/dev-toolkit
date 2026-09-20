import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { FormStatus } from '../../../domain/enums/form-status.enum';

export class CreateFormDto {
  @ApiProperty({ example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: 'Stable programmatic key, unique per entityType', example: 'volunteer-intake' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Volunteer Intake Form' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ nullable: true, example: 'Collects availability and emergency contact details from new volunteers' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ type: [String], default: [], example: ['admin:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  managePermissions?: string[];

  @ApiPropertyOptional({ type: [String], default: [], example: ['read:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  readPermissions?: string[];

  @ApiPropertyOptional({ type: [String], default: [], example: ['write:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  writePermissions?: string[];
}

export class UpdateFormDto {
  @ApiPropertyOptional({ example: 'Volunteer Intake Form' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ nullable: true, example: 'Collects availability and emergency contact details from new volunteers' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['admin:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  managePermissions?: string[];

  @ApiPropertyOptional({ type: [String], example: ['read:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  readPermissions?: string[];

  @ApiPropertyOptional({ type: [String], example: ['write:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  writePermissions?: string[];
}

export class PublishFormDto {
  @ApiPropertyOptional({ description: 'Form id when not supplied via route param', example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  @IsOptional()
  id?: string;
}

export class DisableFormDto {
  @ApiPropertyOptional({ description: 'Form id when not supplied via route param', example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  @IsOptional()
  id?: string;
}

export class ListFormsRequestDto {
  @ApiProperty({ example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiPropertyOptional({ enum: FormStatus, example: FormStatus.Published })
  @IsEnum(FormStatus)
  @IsOptional()
  status?: FormStatus;
}

