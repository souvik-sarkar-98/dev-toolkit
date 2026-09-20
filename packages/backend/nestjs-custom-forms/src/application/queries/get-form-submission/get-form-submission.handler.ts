import { Inject, Injectable, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { FormNotFoundError } from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { FormPolicy } from '../../../domain/policies/form.policy';
import { ICustomFormEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { IFormSubmissionRepository } from '../../../domain/repositories/form-submission.repository';
import { CUSTOM_FORMS_OPTIONS } from '../../../infrastructure/custom-forms-options.token';
import { CustomFormsModuleOptions } from '../../../custom-forms.schema';
import { ResolvedFormFieldValueResponseDto } from '../../dtos/response/form-response.dtos';
import { buildResolvedFormFieldValueDtos } from '../../mappers/resolved-form-field-value-response.mapper';
import { FormSubmissionValidationService } from '../../services/form-submission-validation.service';
import { assertCustomFormEntityAccess } from '../../utilities/custom-form-entity-access.util';
import { GetFormSubmissionQuery } from './get-form-submission.query';

@QueryHandler(GetFormSubmissionQuery)
@Injectable()
export class GetFormSubmissionHandler
  implements IQueryHandler<GetFormSubmissionQuery, ResolvedFormFieldValueResponseDto[]>
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
    private readonly validation: FormSubmissionValidationService,
  ) {}

  async execute(query: GetFormSubmissionQuery): Promise<ResolvedFormFieldValueResponseDto[]> {
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
    FormPolicy.assertPublishedAndEnabled(form);

    const submission = await this.submissionRepo.findByEntity(
      query.entityType,
      query.entityId,
      query.formId,
    );

    const parsedByDefId = this.validation.parsedValuesByFieldDefId(
      form,
      submission?.fieldValues ?? [],
    );

    return buildResolvedFormFieldValueDtos({
      form,
      parsedByDefId,
      userPermissions: query.userPermissions,
      validation: this.validation,
    });
  }
}
