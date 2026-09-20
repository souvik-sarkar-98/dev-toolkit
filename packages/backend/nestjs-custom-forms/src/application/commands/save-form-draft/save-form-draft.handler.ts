import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { FormNotFoundError } from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { FormPolicy } from '../../../domain/policies/form.policy';
import { ICustomFormEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { FormSubmission } from '../../../domain/aggregates/form-submission/form-submission.aggregate';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { IFormSubmissionRepository } from '../../../domain/repositories/form-submission.repository';
import { CUSTOM_FORMS_OPTIONS } from '../../../infrastructure/custom-forms-options.token';
import { CustomFormsModuleOptions } from '../../../custom-forms.schema';
import { ResolvedFormFieldValueResponseDto } from '../../dtos/response/form-response.dtos';
import { buildResolvedFormFieldValueDtos } from '../../mappers/resolved-form-field-value-response.mapper';
import { FormSubmissionValidationService } from '../../services/form-submission-validation.service';
import { assertCustomFormEntityAccess } from '../../utilities/custom-form-entity-access.util';
import { SaveFormDraftCommand } from './save-form-draft.command';

@CommandHandler(SaveFormDraftCommand)
@Injectable()
export class SaveFormDraftHandler
  implements ICommandHandler<SaveFormDraftCommand, ResolvedFormFieldValueResponseDto[]>
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
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: SaveFormDraftCommand): Promise<ResolvedFormFieldValueResponseDto[]> {
    await assertCustomFormEntityAccess(this.options, this.accessPort, {
      entityType: cmd.entityType,
      entityId: cmd.entityId,
      userId: cmd.userId,
      userPermissions: cmd.userPermissions,
      action: 'write',
    });

    const form = await this.formRepo.findByIdWithFields(cmd.formId);
    if (!form) throw new FormNotFoundError(cmd.formId);

    FormAccessPolicy.assertHasPermission(form, 'write', cmd.userPermissions);
    FormPolicy.assertPublishedAndEnabled(form);

    let submission = await this.submissionRepo.findByEntity(
      cmd.entityType,
      cmd.entityId,
      cmd.formId,
    );

    const existingParsedByFieldDefId = this.validation.parsedValuesByFieldDefId(
      form,
      submission?.fieldValues ?? [],
    );

    const updates = this.validation.buildDraftUpdates({
      form,
      values: cmd.values,
      existingParsedByFieldDefId,
      userId: cmd.userId,
      userPermissions: cmd.userPermissions,
    });

    if (!submission) {
      submission = FormSubmission.create({
        entityType: cmd.entityType,
        entityId: cmd.entityId,
        formId: cmd.formId,
      });
    }

    if (updates.length > 0) {
      submission.saveDraft(updates);
    }

    submission = await this.submissionRepo.saveDraft(submission, form);

    const events = [...submission.domainEvents];
    submission.clearEvents();
    this.eventBus.publishAll(events);

    const parsedByDefId = this.validation.parsedValuesByFieldDefId(form, submission.fieldValues);

    return buildResolvedFormFieldValueDtos({
      form,
      parsedByDefId,
      userPermissions: cmd.userPermissions,
      validation: this.validation,
    });
  }
}
