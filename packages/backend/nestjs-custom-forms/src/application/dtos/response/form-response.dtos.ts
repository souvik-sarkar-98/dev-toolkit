import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '../../../domain/enums/custom-field-type.enum';
import { FormStatus } from '../../../domain/enums/form-status.enum';
import { FieldOptionDto } from '../shared/field-option.dto';
import { FieldConditionDto } from '../shared/field-condition.dto';
import { DependentOptionsDto } from '../shared/dependent-options.dto';
import { FieldRegexRuleDto } from '../shared/field-regex-rule.dto';
import { FieldValidationRulesDto } from '../shared/field-validation-rules.dto';
import { IsArray, IsBoolean, IsDate, IsEnum, IsNumber, IsString, isString, ValidateNested } from 'class-validator';

export class FieldOptionResponseDto extends FieldOptionDto {}

export class FieldConditionResponseDto extends FieldConditionDto {}

export class DependentOptionsResponseDto extends DependentOptionsDto {
  @ApiProperty({
    description: 'parentValue → available FieldOptions',
    example: { india: [{ key: 'west-bengal', label: 'West Bengal' }] },
  })
  declare optionMap: Record<string, FieldOptionResponseDto[]>;
}

export class FieldRegexRuleResponseDto extends FieldRegexRuleDto {}

export class FieldValidationRulesResponseDto extends FieldValidationRulesDto {
  @ApiProperty({
    type: [FieldRegexRuleResponseDto],
    description: 'All patterns must match (AND)',
  })
  declare patterns: FieldRegexRuleResponseDto[];
}

export class FormFieldDefinitionResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  id: string;

  @ApiProperty({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  @IsString()
  formId: string;

  @ApiProperty({ example: 'emergency_contact' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Emergency contact number' })
  @IsString()
  label: string;

  @ApiProperty({ enum: Object.values(CustomFieldType), example: CustomFieldType.Phone })
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @ApiProperty({ example: true })
  @IsBoolean()
  mandatory: boolean;

  @ApiProperty({ type: [FieldOptionResponseDto] })
  @ValidateNested({ each: true })
  fieldOptions: FieldOptionResponseDto[];

  @ApiProperty({ example: false })
  @IsBoolean()
  isHidden: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  isEncrypted: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sortOrder: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Wizard step identifier for multi-step forms', example: 'contact-details' })
  @IsString()
  stepId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Display label for the wizard step', example: 'Contact details' })
  @IsString()
  stepName: string | null;

  @ApiPropertyOptional({ type: FieldConditionResponseDto, nullable: true })
  @ValidateNested()
  condition: FieldConditionResponseDto | null;

  @ApiPropertyOptional({ type: DependentOptionsResponseDto, nullable: true })
  @ValidateNested()
  dependentOptions: DependentOptionsResponseDto | null;

  @ApiPropertyOptional({ type: FieldValidationRulesResponseDto, nullable: true })
  @ValidateNested()
  validationRules: FieldValidationRulesResponseDto | null;

  @ApiProperty({ type: [String], example: ['read:custom_forms', 'admin:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  viewPermissions: string[];

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  @IsDate()
  createdAt: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true, example: '2026-03-14T09:30:00.000Z' })
  @IsDate()
  updatedAt: Date | null;
}

export class FormResponseDto {
  @ApiProperty({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'PROJECT' })
  @IsString()
  entityType: string;

  @ApiProperty({ example: 'volunteer-intake' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Volunteer Intake Form' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Collects availability and emergency contact details from new volunteers' })
  @IsString()
  description: string | null;

  @ApiProperty({ enum: Object.values(FormStatus), example: FormStatus.Published })
  @IsEnum(FormStatus)
  status: FormStatus;

  @ApiProperty({ type: [String], example: ['admin:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  managePermissions: string[];

  @ApiProperty({ type: [String], example: ['read:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  readPermissions: string[];

  @ApiProperty({ type: [String], example: ['write:custom_forms'] })
  @IsArray()
  @IsString({ each: true })
  writePermissions: string[];

  @ApiPropertyOptional({ type: [FormFieldDefinitionResponseDto] })
  fields?: FormFieldDefinitionResponseDto[];

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  @IsDate()
  createdAt: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true, example: '2026-03-14T09:30:00.000Z' })
  @IsDate()
  updatedAt: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ nullable: true, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' }) 
  @IsString()
  publishedBy?: string;

  @ApiPropertyOptional({ nullable: true, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  @IsString()
  disabledBy?: string;
}

export class ResolvedFormFieldValueResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  fieldDefId: string;

  @ApiProperty({ example: 'emergency_contact' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Emergency contact number' })
  @IsString()
  label: string;

  @ApiProperty({ enum: Object.values(CustomFieldType), example: CustomFieldType.Phone })
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @ApiPropertyOptional({ type: Object, nullable: true, example: '+919876543210' })
  value: unknown;

  @ApiProperty({ type: [FieldOptionResponseDto] })
  @ValidateNested({ each: true })
  availableOptions: FieldOptionResponseDto[];

  @ApiPropertyOptional({ type: DependentOptionsResponseDto, nullable: true })
  @ValidateNested()
  dependentOptions: DependentOptionsResponseDto | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  mandatory: boolean;

  @ApiPropertyOptional({ type: FieldValidationRulesResponseDto, nullable: true })
  @ValidateNested()
  validationRules: FieldValidationRulesResponseDto | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  isEncrypted: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  isHidden: boolean;

  @ApiPropertyOptional({ type: FieldConditionResponseDto, nullable: true })
  @ValidateNested()
  condition: FieldConditionResponseDto | null;
}

export class FormFieldValueHistoryEntryResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  id: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  fieldDefId: string;

  @ApiProperty({ example: 'emergency_contact' })
  @IsString()
  fieldKey: string;

  @ApiProperty({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  @IsString()
  formId: string;

  @ApiProperty({ example: 'PROJECT' })
  @IsString()
  entityType: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ type: Object, nullable: true, example: '+919812345678' })
  oldValue: unknown;

  @ApiPropertyOptional({ type: Object, nullable: true, example: '+919876543210' })
  newValue: unknown;

  @ApiProperty({ example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  @IsString()
  changedBy: string;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  @IsDate()
  changedAt: Date;
}
