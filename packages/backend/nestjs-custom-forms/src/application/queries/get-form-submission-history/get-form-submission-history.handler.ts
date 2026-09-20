import { Inject, Injectable, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { FormNotFoundError } from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { ICustomFormEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { IFormSubmissionRepository } from '../../../domain/repositories/form-submission.repository';
import { CUSTOM_FORMS_OPTIONS } from '../../../infrastructure/custom-forms-options.token';
import { CustomFormsModuleOptions } from '../../../custom-forms.schema';
import { FormFieldValueHistoryEntryResponseDto } from '../../dtos/response/form-response.dtos';
import { FormFieldValueHistoryEntryResponseMapper } from '../../mappers/form-field-value-history-entry-response.mapper';
import { assertCustomFormEntityAccess } from '../../utilities/custom-form-entity-access.util';
import { GetFormSubmissionHistoryQuery } from './get-form-submission-history.query';

@QueryHandler(GetFormSubmissionHistoryQuery)
@Injectable()
export class GetFormSubmissionHistoryHandler
  implements IQueryHandler<GetFormSubmissionHistoryQuery, FormFieldValueHistoryEntryResponseDto[]>
{
  constructor(
    @Inject(IFormRepository)
    private readonly formRepo: IFormRepository,
    @Inject(IFormSubmissionRepository)
    private readonly submissionRepo: IFormSubmissionRepository,
    @Inject(CUSTOM_FORMS_OPTIONS)
    private readonly options: CustomFormsModuleOptions,
    @Optional()
    @Inject(ICustomFormEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) {}

  async execute(
    query: GetFormSubmissionHistoryQuery,
  ): Promise<FormFieldValueHistoryEntryResponseDto[]> {
    await assertCustomFormEntityAccess(this.options, this.accessPort, {
      entityType: query.entityType,
      entityId: query.entityId,
      userId: query.userId,
      userPermissions: query.userPermissions,
      action: 'read',
    });

    const form = await this.formRepo.findByIdWithFields(query.formId);
    if (!form) throw new FormNotFoundError(query.formId);

    FormAccessPolicy.assertHasPermission(form, 'read', query.userPermissions);

    let fieldDefId: string | undefined;
    if (query.fieldKey) {
      const field = form.fields.find((f) => f.key === query.fieldKey);
      fieldDefId = field?.id;
    }

    const entries = await this.submissionRepo.findHistoryByEntity(
      query.entityType,
      query.entityId,
      query.formId,
      fieldDefId,
    );

    const fieldKeyById = new Map(form.fields.map((f) => [f.id, f.key]));

    return entries.map((entry) =>
      FormFieldValueHistoryEntryResponseMapper.toDto(
        entry,
        fieldKeyById.get(entry.fieldDefId) ?? entry.fieldDefId,
      ),
    );
  }
}
