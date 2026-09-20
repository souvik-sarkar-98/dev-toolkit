import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import {
  FieldConditionViolatedError,
  FieldValidationRuleViolatedError,
  FormNotFoundError,
  MandatoryFieldMissingError,
} from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { FormPolicy } from '../../../domain/policies/form.policy';
import { ICustomFormEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { FormSubmission } from '../../../domain/aggregates/form-submission/form-submission.aggregate';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { IFormSubmissionRepository } from '../../../domain/repositories/form-submission.repository';
import { CUSTOM_FORMS_OPTIONS } from '../../../infrastructure/custom-forms-options.token';
import { CustomFormsModuleOptions } from '../../../custom-forms.schema';
import { FormSubmissionValidationService } from '../../services/form-submission-validation.service';
import { assertCustomFormEntityAccess } from '../../utilities/custom-form-entity-access.util';
import { SubmitFormCommand } from './submit-form.command';

@CommandHandler(SubmitFormCommand)
@Injectable()
export class SubmitFormHandler implements ICommandHandler<SubmitFormCommand, void> {
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

  async execute(cmd: SubmitFormCommand): Promise<void> {
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

    if (cmd.values && Object.keys(cmd.values).length > 0) {
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

      submission.saveDraft(updates);
      submission = await this.submissionRepo.saveDraft(submission, form);

      const draftEvents = [...submission.domainEvents];
      submission.clearEvents();
      this.eventBus.publishAll(draftEvents);
    }

    if (!submission) {
      submission = FormSubmission.create({
        entityType: cmd.entityType,
        entityId: cmd.entityId,
        formId: cmd.formId,
      });
      submission = await this.submissionRepo.saveDraft(submission, form);
    }

    const parsedByDefId = this.validation.parsedValuesByFieldDefId(
      form,
      submission.fieldValues,
    );

    const validationResult = this.validation.validateVisibleFields(
      form,
      parsedByDefId,
      cmd.userPermissions,
    );
    if (validationResult.missingMandatory.length > 0) {
      throw new MandatoryFieldMissingError(validationResult.missingMandatory[0]);
    }
    if (validationResult.conditionViolations.length > 0) {
      throw new FieldConditionViolatedError(validationResult.conditionViolations[0]);
    }
    if (validationResult.validationViolations.length > 0) {
      const fieldKey = validationResult.validationViolations[0];
      const def = form.fields.find((f) => f.key === fieldKey);
      const parsedValue = def ? parsedByDefId.get(def.id) : undefined;
      throw new FieldValidationRuleViolatedError(
        fieldKey,
        def?.validationRules?.regexErrMsgForValue(def.fieldType, parsedValue),
      );
    }

    submission.submit(cmd.userId);

    await this.submissionRepo.update(submission.id, submission);

    const domainEvents = [...submission.domainEvents];
    submission.clearEvents();
    this.eventBus.publishAll(domainEvents);

    const integrationEvents = [...submission.integrationEvents];
    submission.clearIntegrationEvents();
    this.eventBus.publishAll(integrationEvents);
  }
}
