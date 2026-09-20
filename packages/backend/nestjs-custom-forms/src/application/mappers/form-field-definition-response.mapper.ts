import { FormFieldDefinition } from '../../domain/entities/form-field-definition/form-field-definition.entity';
import {
  DependentOptionsResponseDto,
  FieldConditionResponseDto,
  FieldOptionResponseDto,
  FieldRegexRuleResponseDto,
  FieldValidationRulesResponseDto,
  FormFieldDefinitionResponseDto,
} from '../dtos/response/form-response.dtos';
import { FieldOption } from '../../domain/value-objects/field-option/field-option.vo';
import { FieldCondition } from '../../domain/value-objects/field-condition/field-condition.vo';
import { DependentOptions } from '../../domain/value-objects/dependent-options/dependent-options.vo';
import { FieldValidationRules } from '../../domain/value-objects/field-validation-rules/field-validation-rules.vo';

export class FormFieldDefinitionResponseMapper {
  static toDto(field: FormFieldDefinition): FormFieldDefinitionResponseDto {
    const dto = new FormFieldDefinitionResponseDto();
    dto.id              = field.id;
    dto.formId          = field.formId;
    dto.key             = field.key;
    dto.label           = field.label;
    dto.fieldType       = field.fieldType;
    dto.mandatory       = field.mandatory;
    dto.fieldOptions    = [...field.fieldOptions].map(FormFieldDefinitionResponseMapper.toFieldOptionDto);
    dto.isHidden        = field.isHidden;
    dto.isEncrypted     = field.isEncrypted;
    dto.enabled         = field.enabled;
    dto.sortOrder       = field.sortOrder;
    dto.stepId          = field.stepId;
    dto.stepName        = field.stepName;
    dto.condition       = field.condition
      ? FormFieldDefinitionResponseMapper.toConditionDto(field.condition)
      : null;
    dto.dependentOptions = field.dependentOptions
      ? FormFieldDefinitionResponseMapper.toDependentOptionsDto(field.dependentOptions)
      : null;
    dto.validationRules = field.validationRules
      ? FormFieldDefinitionResponseMapper.toValidationRulesDto(field.validationRules)
      : null;
    dto.viewPermissions = [...field.viewPermissions];
    dto.createdAt       = field.createdAt;
    dto.updatedAt       = field.updatedAt ?? null;
    return dto;
  }

  static toFieldOptionDto(option: FieldOption): FieldOptionResponseDto {
    const dto = new FieldOptionResponseDto();
    dto.key   = option.key;
    dto.label = option.label;
    return dto;
  }

  static toConditionDto(condition: FieldCondition): FieldConditionResponseDto {
    const dto = new FieldConditionResponseDto();
    dto.dependsOnKey = condition.dependsOnKey;
    dto.operator     = condition.operator;
    dto.value        = condition.value;
    return dto;
  }

  static toDependentOptionsDto(dependentOptions: DependentOptions): DependentOptionsResponseDto {
    const dto = new DependentOptionsResponseDto();
    dto.dependsOnKey = dependentOptions.dependsOnKey;
    dto.optionMap = Object.fromEntries(
      Object.entries(dependentOptions.optionMap).map(([parentKey, opts]) => [
        parentKey,
        [...opts].map(FormFieldDefinitionResponseMapper.toFieldOptionDto),
      ]),
    );
    return dto;
  }

  static toValidationRulesDto(rules: FieldValidationRules): FieldValidationRulesResponseDto {
    const dto = new FieldValidationRulesResponseDto();
    dto.patterns = rules.patterns.map((rule) => {
      const item = new FieldRegexRuleResponseDto();
      item.pattern = rule.pattern;
      if (rule.regexErrMsg) item.regexErrMsg = rule.regexErrMsg;
      return item;
    });
    return dto;
  }
}
