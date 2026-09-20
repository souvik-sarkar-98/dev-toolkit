import { CustomFieldType } from '../../domain/enums/custom-field-type.enum';
import { Form } from '../../domain/aggregates/form/form.aggregate';
import { FormFieldDefinition } from '../../domain/entities/form-field-definition/form-field-definition.entity';
import type { CustomFieldValueParsed } from '../../domain/value-objects/field-condition/field-condition.vo';
import { ResolvedFormFieldValueResponseDto } from '../dtos/response/form-response.dtos';
import { FormFieldDefinitionResponseMapper } from './form-field-definition-response.mapper';
import { FormSubmissionValidationService } from '../services/form-submission-validation.service';

export function buildResolvedFormFieldValueDtos(params: {
  form: Form;
  parsedByDefId: Map<string, CustomFieldValueParsed>;
  userPermissions: string[];
  validation: FormSubmissionValidationService;
}): ResolvedFormFieldValueResponseDto[] {
  const { form, parsedByDefId, userPermissions, validation } = params;
  const defByKey = new Map(form.fields.map((f) => [f.key, f]));

  return form.fields
    .filter((def) => validation.isFieldVisible(def, defByKey, parsedByDefId, userPermissions))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((def) => toResolvedDto(def, defByKey, parsedByDefId));
}

function toResolvedDto(
  def: FormFieldDefinition,
  defByKey: Map<string, FormFieldDefinition>,
  parsedByDefId: Map<string, CustomFieldValueParsed>,
): ResolvedFormFieldValueResponseDto {
  const parsedValue = parsedByDefId.get(def.id) ?? null;

  let availableOptions = [...def.fieldOptions];
  if (
    def.dependentOptions &&
    (def.fieldType === CustomFieldType.Select ||
      def.fieldType === CustomFieldType.Multiselect)
  ) {
    const parentDef = defByKey.get(def.dependentOptions.dependsOnKey);
    const parentValue = parentDef
      ? (parsedByDefId.get(parentDef.id) as string | null)
      : null;
    availableOptions = [...def.dependentOptions.getOptionsFor(parentValue)];
  }

  const dto = new ResolvedFormFieldValueResponseDto();
  dto.fieldDefId = def.id;
  dto.key = def.key;
  dto.label = def.label;
  dto.fieldType = def.fieldType;
  dto.value = parsedValue;
  dto.availableOptions = availableOptions.map(FormFieldDefinitionResponseMapper.toFieldOptionDto);
  dto.dependentOptions = def.dependentOptions
    ? FormFieldDefinitionResponseMapper.toDependentOptionsDto(def.dependentOptions)
    : null;
  dto.mandatory = def.mandatory;
  dto.validationRules = def.validationRules
    ? FormFieldDefinitionResponseMapper.toValidationRulesDto(def.validationRules)
    : null;
  dto.isEncrypted = def.isEncrypted;
  dto.isHidden = def.isHidden;
  dto.condition = def.condition
    ? FormFieldDefinitionResponseMapper.toConditionDto(def.condition)
    : null;
  return dto;
}
