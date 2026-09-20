import { z } from 'zod';
import type { FormFieldDefinition } from '@ssdev-toolkit/forms-core';
import { normalizeFieldValidationRules } from '@ssdev-toolkit/forms-core';

function applyValidationRules(
  fieldSchema: z.ZodString,
  field: FormFieldDefinition,
): z.ZodString {
  const rules = normalizeFieldValidationRules(field.validationRules);
  let schema = fieldSchema;

  for (const rule of rules) {
    if (!rule.pattern) continue;
    try {
      const regex = new RegExp(rule.pattern);
      schema = schema.regex(
        regex,
        rule.regexErrMsg ?? `Enter a valid ${field.label.toLowerCase()}`,
      );
    } catch {
      continue;
    }
  }

  return schema;
}

export function buildFormZodSchema(fields: FormFieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.fieldType) {
      case 'email':
        fieldSchema = z.string().email(`Enter a valid ${field.label.toLowerCase()}`);
        break;
      case 'phone':
        fieldSchema = z.string().min(1, `${field.label} is required`);
        fieldSchema = applyValidationRules(fieldSchema as z.ZodString, field);
        break;
      case 'number':
        fieldSchema = z.string();
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'textarea':
      case 'text':
      case 'select':
      case 'date':
      default:
        fieldSchema = z.string();
        break;
    }

    if (field.mandatory) {
      if (field.fieldType === 'boolean') {
        fieldSchema = (fieldSchema as z.ZodBoolean).refine((value) => value === true, {
          message: `${field.label} is required`,
        });
      } else if (
        field.fieldType === 'text' ||
        field.fieldType === 'textarea' ||
        field.fieldType === 'select' ||
        field.fieldType === 'number' ||
        field.fieldType === 'date'
      ) {
        fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        fieldSchema = applyValidationRules(fieldSchema as z.ZodString, field);
      }
    } else if (field.fieldType === 'boolean') {
      fieldSchema = fieldSchema.optional();
    } else {
      fieldSchema = (fieldSchema as z.ZodString).optional().or(z.literal(''));
      fieldSchema = applyValidationRules(fieldSchema as z.ZodString, field);
    }

    shape[field.key] = fieldSchema;
  }

  return z.object(shape);
}
