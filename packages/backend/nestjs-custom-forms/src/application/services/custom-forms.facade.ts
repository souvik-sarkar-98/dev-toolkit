import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { ClearFormSubmissionCommand } from '../commands/clear-form-submission/clear-form-submission.command';
import { SaveFormDraftCommand } from '../commands/save-form-draft/save-form-draft.command';
import { SubmitFormCommand } from '../commands/submit-form/submit-form.command';
import { FormNotFoundError, FormSubmissionInvalidError } from '../../domain/errors/form.errors';
import { FormResponseDto, ResolvedFormFieldValueResponseDto } from '../dtos/response/form-response.dtos';
import { FormValidationResultResponseDto } from '../dtos/response/form-validation-result-response.dto';
import { GetFormSubmissionQuery } from '../queries/get-form-submission/get-form-submission.query';
import { GetPublishedFormByKeyQuery } from '../queries/get-published-form-by-key/get-published-form-by-key.query';
import { ValidateFormSubmissionQuery } from '../queries/validate-form-submission/validate-form-submission.query';

export interface CustomFormsSubmissionParams {
  formId: string;
  entityType: string;
  entityId: string;
  values: Record<string, unknown>;
  submittedById: string;
  userPermissions?: string[];
}

export interface CustomFormsEntityParams {
  formId: string;
  entityType: string;
  entityId: string;
  userId: string;
  userPermissions?: string[];
}

export interface CustomFormsDraftParams extends CustomFormsEntityParams {
  values: Record<string, unknown>;
  submittedById: string;
}

@Injectable()
export class CustomFormsFacade {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  getPublishedFormByKey(
    entityType: string,
    key: string,
    userPermissions: string[] = [],
    userId: string = '',
  ): Promise<FormResponseDto> {
    return this.queryBus.execute(
      new GetPublishedFormByKeyQuery(entityType, key, userPermissions, userId),
    );
  }

  async resolveFormIdForKey(
    entityType: string,
    formKey: string,
    userPermissions: string[] = [],
    userId: string = '',
  ): Promise<string> {
    try {
      const form = await this.getPublishedFormByKey(entityType, formKey, userPermissions, userId);
      return form.id;
    } catch (error) {
      if (error instanceof FormNotFoundError) {
        return formKey;
      }
      throw error;
    }
  }

  getFormSubmissionFields(
    params: CustomFormsEntityParams,
  ): Promise<ResolvedFormFieldValueResponseDto[]> {
    return this.queryBus.execute(
      new GetFormSubmissionQuery(
        params.formId,
        params.entityType,
        params.entityId,
        params.userId,
        params.userPermissions ?? [],
      ),
    );
  }

  saveFormDraft(params: CustomFormsDraftParams): Promise<ResolvedFormFieldValueResponseDto[]> {
    return this.commandBus.execute(
      new SaveFormDraftCommand(
        params.formId,
        params.entityType,
        params.entityId,
        params.values,
        params.submittedById,
        params.userPermissions ?? [],
      ),
    );
  }

  submitForm(params: CustomFormsDraftParams): Promise<void> {
    return this.commandBus.execute(
      new SubmitFormCommand(
        params.formId,
        params.entityType,
        params.entityId,
        params.values,
        params.submittedById,
        params.userPermissions ?? [],
      ),
    );
  }

  validateFormSubmission(
    params: CustomFormsEntityParams,
  ): Promise<FormValidationResultResponseDto> {
    return this.queryBus.execute(
      new ValidateFormSubmissionQuery(
        params.formId,
        params.entityType,
        params.entityId,
        params.userId,
        params.userPermissions ?? [],
      ),
    );
  }

  clearFormSubmission(
    params: CustomFormsEntityParams & { clearedById: string },
  ): Promise<void> {
    return this.commandBus.execute(
      new ClearFormSubmissionCommand(
        params.formId,
        params.entityType,
        params.entityId,
        params.clearedById,
        params.userPermissions ?? [],
      ),
    );
  }

  async validateSubmission(params: CustomFormsSubmissionParams): Promise<void> {
    const permissions = params.userPermissions ?? [];
    await this.commandBus.execute(
      new SaveFormDraftCommand(
        params.formId,
        params.entityType,
        params.entityId,
        params.values,
        params.submittedById,
        permissions,
      ),
    );

    const validation = await this.queryBus.execute<
      ValidateFormSubmissionQuery,
      FormValidationResultResponseDto
    >(
      new ValidateFormSubmissionQuery(
        params.formId,
        params.entityType,
        params.entityId,
        params.submittedById,
        permissions,
      ),
    );

    if (!validation.valid) {
      const messages = [
        ...validation.missingMandatory.map((k) => `${k} is required`),
        ...validation.validationViolations.map((k) => `${k} failed validation`),
        ...validation.conditionViolations.map((k) => `${k} condition not satisfied`),
      ];
      throw new FormSubmissionInvalidError(messages);
    }
  }

  async validateAndSubmit(params: CustomFormsSubmissionParams): Promise<string> {
    const entityId = params.entityId || randomUUID();
    await this.validateSubmission({ ...params, entityId });
    const permissions = params.userPermissions ?? [];
    await this.commandBus.execute(
      new SubmitFormCommand(
        params.formId,
        params.entityType,
        entityId,
        params.values,
        params.submittedById,
        permissions,
      ),
    );
    return entityId;
  }
}
