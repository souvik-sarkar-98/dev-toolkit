import { CustomFieldType } from '../../../domain/enums/custom-field-type.enum';
import { FieldOption } from '../../../domain/value-objects/field-option/field-option.vo';
import { FieldCondition } from '../../../domain/value-objects/field-condition/field-condition.vo';
import { DependentOptions } from '../../../domain/value-objects/dependent-options/dependent-options.vo';
import { FieldValidationRules } from '../../../domain/value-objects/field-validation-rules/field-validation-rules.vo';

export class AddFormFieldCommand {
  constructor(
    public readonly formId: string,
    public readonly key: string,
    public readonly label: string,
    public readonly fieldType: CustomFieldType,
    public readonly mandatory: boolean,
    public readonly fieldOptions: FieldOption[],
    public readonly isHidden: boolean,
    public readonly isEncrypted: boolean,
    public readonly sortOrder: number,
    public readonly userId: string,
    public readonly userPermissions: string[],
    public readonly condition?: FieldCondition | null,
    public readonly dependentOptions?: DependentOptions | null,
    public readonly viewPermissions: string[] = [],
    public readonly validationRules?: FieldValidationRules | null,
    public readonly stepId?: string | null,
    public readonly stepName?: string | null,
  ) {}
}
