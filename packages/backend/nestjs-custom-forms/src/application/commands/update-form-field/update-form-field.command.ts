import { CustomFieldType } from '../../../domain/enums/custom-field-type.enum';
import { FieldOption } from '../../../domain/value-objects/field-option/field-option.vo';
import { FieldCondition } from '../../../domain/value-objects/field-condition/field-condition.vo';
import { DependentOptions } from '../../../domain/value-objects/dependent-options/dependent-options.vo';
import { FieldValidationRules } from '../../../domain/value-objects/field-validation-rules/field-validation-rules.vo';

export class UpdateFormFieldCommand {
  constructor(
    public readonly formId: string,
    public readonly fieldId: string,
    public readonly label: string | undefined,
    public readonly fieldType: CustomFieldType | undefined,
    public readonly mandatory: boolean | undefined,
    public readonly fieldOptions: FieldOption[] | undefined,
    public readonly isHidden: boolean | undefined,
    public readonly isEncrypted: boolean | undefined,
    public readonly sortOrder: number | undefined,
    public readonly userId: string,
    public readonly userPermissions: string[],
    public readonly condition?: FieldCondition | null,
    public readonly dependentOptions?: DependentOptions | null,
    public readonly viewPermissions?: string[],
    public readonly validationRules?: FieldValidationRules | null,
    public readonly stepId?: string | null,
    public readonly stepName?: string | null,
  ) {}
}
