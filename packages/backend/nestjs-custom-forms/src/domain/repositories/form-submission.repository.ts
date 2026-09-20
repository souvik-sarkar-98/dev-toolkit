import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { Form } from '../aggregates/form/form.aggregate';
import { FormSubmission } from '../aggregates/form-submission/form-submission.aggregate';
import { FormFieldValueHistoryEntry } from '../entities/form-field-value-history-entry/form-field-value-history-entry.entity';

export interface FormSubmissionFilter {
  entityType?: string;
  entityId?: string;
  formId?: string;
  fieldDefId?: string;
}

export const IFormSubmissionRepository = Symbol('IFormSubmissionRepository');

export interface IFormSubmissionRepository
  extends IRepository<FormSubmission, string, FormSubmissionFilter> {
  findByEntity(
    entityType: string,
    entityId: string,
    formId: string,
  ): Promise<FormSubmission | null>;

  saveDraft(
    submission: FormSubmission,
    form: Form,
  ): Promise<FormSubmission>;

  clearByEntity(
    entityType: string,
    entityId: string,
    formId: string,
  ): Promise<void>;

  findHistoryByEntity(
    entityType: string,
    entityId: string,
    formId: string,
    fieldDefId?: string,
  ): Promise<FormFieldValueHistoryEntry[]>;
}
