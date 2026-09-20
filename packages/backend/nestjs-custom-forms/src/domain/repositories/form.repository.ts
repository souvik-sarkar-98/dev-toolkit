import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { Form } from '../aggregates/form/form.aggregate';
import { FormStatus } from '../enums/form-status.enum';

export interface FormFilter {
  entityType?: string;
  status?: FormStatus;
  key?: string;
}

export const IFormRepository = Symbol('IFormRepository');

export interface IFormRepository extends IRepository<Form, string, FormFilter> {
  findByKey(entityType: string, key: string): Promise<Form | null>;
  findByEntityType(
    entityType: string,
    options?: { status?: FormStatus; includeDisabled?: boolean },
  ): Promise<Form[]>;
  findByIdWithFields(formId: string): Promise<Form | null>;
  findById(id: string): Promise<Form | null>;
}
