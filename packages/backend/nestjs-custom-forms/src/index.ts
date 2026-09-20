// Domain enums (canonical form field contract for APIs and UI libraries)
export {
  CustomFieldType,
  CUSTOM_FIELD_TYPES,
} from './domain/enums/custom-field-type.enum';

// Module
export { CustomFormsModule } from './custom-forms.module';
export type { CustomFormsModuleAsyncOptions } from './custom-forms.module';

// Schema / Options
export {
  CustomFormsOptionsSchema,
  DEFAULT_CUSTOM_FORMS_CACHE_TTL_MS,
} from './custom-forms.schema';
export type { FormFieldStoredValue } from './infrastructure/utilities/form-field-stored-value.util';
export {
  isStoredValueEmpty,
  storedValuesEqual,
} from './infrastructure/utilities/form-field-stored-value.util';
export { ICustomFormEntityAccessPort } from './domain/ports/entity-access.port';
export type { CustomFormsModuleOptions, EntityTypeConfig } from './custom-forms.schema';

// Options injection token
export { CUSTOM_FORMS_OPTIONS } from './infrastructure/custom-forms-options.token';
export { FieldValueCodecService } from './infrastructure/services/field-value-codec.service';

// Repository tokens — **host persistence only** (`apps/*/shared/persistence`).
// Feature modules integrate via CustomFormsFacade, not IFormRepository / IFormSubmissionRepository.
export { IFormRepository } from './domain/repositories/form.repository';
export { FormSubmissionInvalidError, FormNotFoundError } from './domain/errors/form.errors';
export { IFormSubmissionRepository } from './domain/repositories/form-submission.repository';

// Commands (for use from sibling modules — e.g. cleanup on entity delete)
export { ClearFormSubmissionCommand } from './application/commands/clear-form-submission/clear-form-submission.command';
export { SaveFormDraftCommand } from './application/commands/save-form-draft/save-form-draft.command';
export { SubmitFormCommand } from './application/commands/submit-form/submit-form.command';

export { CustomFormsFacade } from './application/services/custom-forms.facade';
export type {
  CustomFormsSubmissionParams,
  CustomFormsEntityParams,
  CustomFormsDraftParams,
} from './application/services/custom-forms.facade';

// Queries (for use from sibling modules)
export { GetFormSubmissionQuery } from './application/queries/get-form-submission/get-form-submission.query';
export { GetFormWithFieldsQuery } from './application/queries/get-form-with-fields/get-form-with-fields.query';
export { GetPublishedFormByKeyQuery } from './application/queries/get-published-form-by-key/get-published-form-by-key.query';
export { ValidateFormSubmissionQuery } from './application/queries/validate-form-submission/validate-form-submission.query';
export { FormSubmissionValidationService } from './application/services/form-submission-validation.service';

// Shared API shapes
export { FieldOptionDto } from './application/dtos/shared/field-option.dto';
export { FieldConditionDto } from './application/dtos/shared/field-condition.dto';
export { DependentOptionsDto } from './application/dtos/shared/dependent-options.dto';
export { FieldRegexRuleDto } from './application/dtos/shared/field-regex-rule.dto';
export { FieldValidationRulesDto } from './application/dtos/shared/field-validation-rules.dto';

// Response DTOs (for use from sibling modules)
export {
  FormResponseDto,
  FormFieldDefinitionResponseDto,
  ResolvedFormFieldValueResponseDto,
  FormFieldValueHistoryEntryResponseDto,
  FieldOptionResponseDto,
  FieldRegexRuleResponseDto,
  FieldValidationRulesResponseDto,
} from './application/dtos/response/form-response.dtos';

// Domain events (for application-level event handlers in the consuming app)
export { FormCreatedEvent } from './domain/events/form-created.event';
export { FormUpdatedEvent } from './domain/events/form-updated.event';
export { FormPublishedEvent } from './domain/events/form-published.event';
export { FormDisabledEvent } from './domain/events/form-disabled.event';
export { FormFieldAddedEvent } from './domain/events/form-field-added.event';
export { FormFieldUpdatedEvent } from './domain/events/form-field-updated.event';
export { FormFieldDisabledEvent } from './domain/events/form-field-disabled.event';
export { FormSubmittedEvent } from './domain/events/form-submitted.event';
export { FormSubmissionClearedEvent } from './domain/events/form-submission-cleared.event';
export { FormFieldValuesUpdatedEvent } from './domain/events/form-field-values-updated.event';
