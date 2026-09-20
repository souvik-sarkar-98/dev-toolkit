import { Injectable } from '@nestjs/common';
import { CustomFieldType } from '../../domain/enums/custom-field-type.enum';
import {
  FormAccessDeniedError,
  FormFieldNotFoundError,
  MandatoryFieldMissingError,
} from '../../domain/errors/form.errors';
import { Form } from '../../domain/aggregates/form/form.aggregate';
import { FormFieldDefinition } from '../../domain/entities/form-field-definition/form-field-definition.entity';
import { FormFieldValuePolicy } from '../../domain/policies/form-field-value.policy';
import type { CustomFieldValueParsed } from '../../domain/value-objects/field-condition/field-condition.vo';
import { isParsedValueEmpty } from '../../domain/utilities/form-field-parsed-value.util';

@Injectable()
export class FormSubmissionValidationService {
  canSeeFormField(field: FormFieldDefinition, userPermissions: string[]): boolean {
    if (field.viewPermissions.length === 0) return true;
    const userPermSet = new Set(userPermissions);
    return [...field.viewPermissions].some((p) => userPermSet.has(p));
  }

  buildDraftUpdates(params: {
    form: Form;
    values: Record<string, unknown>;
    existingParsedByFieldDefId: Map<string, CustomFieldValueParsed>;
    userId: string;
    userPermissions: string[];
    enforceMandatory?: boolean;
  }): Array<{ fieldDefId: string; value: CustomFieldValueParsed; changedBy: string }> {
    const {
      form,
      values,
      existingParsedByFieldDefId,
      userId,
      userPermissions,
      enforceMandatory = false,
    } = params;

    const enabledFields = form.fields.filter((f) => f.enabled);
    const defByKey = new Map<string, FormFieldDefinition>(
      enabledFields.map((f) => [f.key, f]),
    );
    const incomingValues = new Map(Object.entries(values));

    if (enforceMandatory) {
      for (const def of enabledFields) {
        if (!this.canSeeFormField(def, userPermissions)) continue;
        if (!def.mandatory) continue;

        const isBeingSubmitted = Object.prototype.hasOwnProperty.call(values, def.key);
        const hasExistingValue = !isParsedValueEmpty(
          existingParsedByFieldDefId.get(def.id) ?? null,
        );

        if (isBeingSubmitted) {
          const raw = values[def.key];
          if (raw === null || raw === undefined || raw === '') {
            throw new MandatoryFieldMissingError(def.key);
          }
        } else if (!hasExistingValue) {
          throw new MandatoryFieldMissingError(def.key);
        }
      }
    }

    const updates: Array<{
      fieldDefId: string;
      value: CustomFieldValueParsed;
      changedBy: string;
    }> = [];

    for (const [key, rawValue] of Object.entries(values)) {
      const definition = defByKey.get(key);
      if (!definition) throw new FormFieldNotFoundError(key, form.id);

      if (!this.canSeeFormField(definition, userPermissions)) {
        throw new FormAccessDeniedError('write', form.id);
      }

      const parentDef = definition.dependentOptions
        ? defByKey.get(definition.dependentOptions.dependsOnKey)
        : null;

      let currentParentValue: string | null = null;
      if (parentDef) {
        const incomingParentRaw = incomingValues.get(parentDef.key);
        if (incomingParentRaw !== undefined) {
          currentParentValue = incomingParentRaw != null ? String(incomingParentRaw) : null;
        } else {
          const existingParent = existingParsedByFieldDefId.get(parentDef.id) ?? null;
          if (typeof existingParent === 'string') {
            currentParentValue = existingParent;
          } else if (Array.isArray(existingParent) && existingParent.length) {
            currentParentValue = existingParent[0];
          }
        }
      }

      if (rawValue !== null && rawValue !== undefined) {
        FormFieldValuePolicy.assertValueType(key, definition.fieldType, rawValue);
        FormFieldValuePolicy.assertOptionAllowed(
          key,
          definition.fieldType,
          rawValue,
          definition.fieldOptions,
          definition.dependentOptions,
          currentParentValue,
        );
        FormFieldValuePolicy.assertPatternMatch(
          key,
          definition.fieldType,
          rawValue,
          definition.validationRules,
        );
      }

      const parsed = this.normaliseIncomingValue(definition.fieldType, rawValue);

      updates.push({
        fieldDefId: definition.id,
        value: parsed,
        changedBy: userId,
      });
    }

    return updates;
  }

  parsedValuesByFieldDefId(
    form: Form,
    submissionFieldValues: ReadonlyArray<{ fieldDefId: string; value: CustomFieldValueParsed }>,
  ): Map<string, CustomFieldValueParsed> {
    const byDefId = new Map<string, CustomFieldValueParsed>();
    for (const fv of submissionFieldValues) {
      byDefId.set(fv.fieldDefId, fv.value);
    }
    for (const def of form.fields) {
      if (!byDefId.has(def.id)) {
        byDefId.set(def.id, null);
      }
    }
    return byDefId;
  }

  isFieldVisible(
    def: FormFieldDefinition,
    defByKey: Map<string, FormFieldDefinition>,
    parsedByDefId: Map<string, CustomFieldValueParsed>,
    userPermissions: string[],
  ): boolean {
    if (!def.enabled) return false;
    if (!this.canSeeFormField(def, userPermissions)) return false;
    if (!def.condition) return true;

    const parentDef = defByKey.get(def.condition.dependsOnKey);
    if (!parentDef) return false;
    return def.condition.isSatisfiedBy(parsedByDefId.get(parentDef.id) ?? null);
  }

  validateVisibleFields(
    form: Form,
    parsedByDefId: Map<string, CustomFieldValueParsed>,
    userPermissions: string[],
  ): {
    missingMandatory: string[];
    conditionViolations: string[];
    validationViolations: string[];
  } {
    const defByKey = new Map(form.fields.map((f) => [f.key, f]));
    const missingMandatory: string[] = [];
    const conditionViolations: string[] = [];
    const validationViolations: string[] = [];

    for (const def of form.fields) {
      if (!this.isFieldVisible(def, defByKey, parsedByDefId, userPermissions)) continue;

      const parsedValue = parsedByDefId.get(def.id) ?? null;

      if (def.mandatory && isParsedValueEmpty(parsedValue)) {
        missingMandatory.push(def.key);
      }

      if (
        !isParsedValueEmpty(parsedValue) &&
        (def.fieldType === CustomFieldType.Select ||
          def.fieldType === CustomFieldType.Multiselect)
      ) {
        let availableKeys: Set<string>;
        if (def.dependentOptions) {
          const parentDef = defByKey.get(def.dependentOptions.dependsOnKey);
          const parentValue = parentDef
            ? (parsedByDefId.get(parentDef.id) as string | null)
            : null;
          availableKeys = new Set(
            [...def.dependentOptions.getOptionsFor(parentValue)].map((o) => o.key),
          );
        } else {
          availableKeys = new Set([...def.fieldOptions].map((o) => o.key));
        }

        if (availableKeys.size > 0) {
          const keys = Array.isArray(parsedValue)
            ? (parsedValue as string[])
            : [parsedValue as string];
          if (keys.some((k) => !availableKeys.has(k))) {
            conditionViolations.push(def.key);
          }
        }
      }

      if (
        parsedValue !== null &&
        parsedValue !== undefined &&
        def.validationRules &&
        !def.validationRules.matchesValue(def.fieldType, parsedValue)
      ) {
        validationViolations.push(def.key);
      }
    }

    return { missingMandatory, conditionViolations, validationViolations };
  }

  private normaliseIncomingValue(
    fieldType: CustomFieldType,
    rawValue: unknown,
  ): CustomFieldValueParsed {
    if (rawValue === null || rawValue === undefined) {
      return null;
    }
    if (fieldType === CustomFieldType.Number) {
      return typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
    }
    if (fieldType === CustomFieldType.Boolean) {
      if (typeof rawValue === 'boolean') return rawValue;
      return String(rawValue) === 'true';
    }
    if (fieldType === CustomFieldType.Multiselect) {
      return (rawValue as string[]).map(String);
    }
    return String(rawValue);
  }
}
