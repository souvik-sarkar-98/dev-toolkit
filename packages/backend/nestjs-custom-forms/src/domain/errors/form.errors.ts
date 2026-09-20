import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class FormAccessDeniedError extends BusinessError {
  constructor(action: string, formId: string, entityId?: string) {
    const location = entityId ? `form ${formId}/${entityId}` : `form ${formId}`;
    super(
      `No ${action} access to ${location}`,
      'CUSTOM_FORM_ACCESS_DENIED',
      403,
    );
  }
}

export class FormKeyAlreadyExistsError extends BusinessError {
  constructor(key: string, entityType: string) {
    super(
      `A form with key "${key}" already exists for entityType "${entityType}"`,
      'CUSTOM_FORM_KEY_ALREADY_EXISTS',
      409,
    );
  }
}

export class FormFieldKeyAlreadyExistsError extends BusinessError {
  constructor(key: string, formId: string) {
    super(
      `A field with key "${key}" already exists for form "${formId}"`,
      'CUSTOM_FORM_FIELD_KEY_ALREADY_EXISTS',
      409,
    );
  }
}

export class FormNotFoundError extends BusinessError {
  constructor(idOrKey: string) {
    super(
      `Form "${idOrKey}" not found`,
      'CUSTOM_FORM_NOT_FOUND',
      404,
    );
  }
}

export class FormFieldNotFoundError extends BusinessError {
  constructor(idOrKey: string, formId?: string) {
    const scope = formId ? ` on form "${formId}"` : '';
    super(
      `Form field "${idOrKey}" not found${scope}`,
      'CUSTOM_FORM_FIELD_NOT_FOUND',
      404,
    );
  }
}

export class FormSubmissionNotFoundError extends BusinessError {
  constructor(entityType: string, entityId: string, formId: string) {
    super(
      `Form submission not found for ${entityType}/${entityId} on form "${formId}"`,
      'CUSTOM_FORM_SUBMISSION_NOT_FOUND',
      404,
    );
  }
}

export class InvalidFieldValueError extends BusinessError {
  constructor(message: string) {
    super(message, 'CUSTOM_FORM_INVALID_VALUE', 400);
  }
}

export class FieldConditionViolatedError extends BusinessError {
  constructor(fieldKey: string) {
    super(
      `Field "${fieldKey}" has a stale or invalid value relative to its parent condition field`,
      'CUSTOM_FORM_CONDITION_VIOLATED',
      400,
    );
  }
}

export class EncryptionKeyMissingError extends BusinessError {
  constructor(fieldKey: string) {
    super(
      `Field "${fieldKey}" is encrypted but no encryptionKey is configured on CustomFormsModule`,
      'CUSTOM_FORM_ENCRYPTION_KEY_MISSING',
      500,
    );
  }
}

export class InvalidFieldDefinitionError extends BusinessError {
  constructor(message: string) {
    super(message, 'CUSTOM_FORM_INVALID_DEFINITION', 400);
  }
}

export class MandatoryFieldMissingError extends BusinessError {
  constructor(fieldKey: string) {
    super(
      `Field "${fieldKey}" is mandatory and must have a value`,
      'CUSTOM_FORM_MANDATORY_MISSING',
      400,
    );
  }
}

export class FieldValidationRuleViolatedError extends BusinessError {
  constructor(fieldKey: string, regexErrMsg?: string) {
    super(
      regexErrMsg ?? `Field "${fieldKey}" does not match the required format`,
      'CUSTOM_FORM_VALIDATION_RULE_VIOLATED',
      400,
    );
  }
}

export class InvalidFormKeyError extends BusinessError {
  constructor(key: string) {
    super(
      `Key "${key}" is invalid — must match /^[a-zA-Z][a-zA-Z0-9_]*$/ (no spaces)`,
      'CUSTOM_FORM_INVALID_KEY',
      400,
    );
  }
}

export class FormNotPublishedError extends BusinessError {
  constructor(formId: string) {
    super(
      `Form "${formId}" is not published`,
      'CUSTOM_FORM_NOT_PUBLISHED',
      400,
    );
  }
}

export class FormDisabledError extends BusinessError {
  constructor(formId: string) {
    super(
      `Form "${formId}" is disabled`,
      'CUSTOM_FORM_DISABLED',
      400,
    );
  }
}

export class FormSubmissionAlreadySubmittedError extends BusinessError {
  constructor(entityType: string, entityId: string, formId: string) {
    super(
      `Form submission for ${entityType}/${entityId} on form "${formId}" is already submitted`,
      'CUSTOM_FORM_SUBMISSION_ALREADY_SUBMITTED',
      400,
    );
  }
}

export class FormSubmissionInvalidError extends BusinessError {
  constructor(messages: string[]) {
    super(
      messages.join('; ') || 'Validation failed',
      'CUSTOM_FORM_SUBMISSION_INVALID',
      400,
    );
  }
}

export class FormFieldMutationNotAllowedError extends BusinessError {
  constructor(formId: string, operation?: string) {
    super(
      `Field ${operation ?? 'mutation'} is not allowed on form "${formId}" in its current status`,
      'CUSTOM_FORM_FIELD_MUTATION_NOT_ALLOWED',
      400,
    );
  }
}
