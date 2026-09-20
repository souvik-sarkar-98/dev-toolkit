import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { FormNotFoundError } from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { FormFieldDefinitionResponseDto } from '../../dtos/response/form-response.dtos';
import { FormFieldDefinitionResponseMapper } from '../../mappers/form-field-definition-response.mapper';
import { UpdateFormFieldCommand } from './update-form-field.command';

@CommandHandler(UpdateFormFieldCommand)
@Injectable()
export class UpdateFormFieldHandler
  implements ICommandHandler<UpdateFormFieldCommand, FormFieldDefinitionResponseDto>
{
  constructor(
    @Inject(IFormRepository)
    private readonly formRepo: IFormRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: UpdateFormFieldCommand): Promise<FormFieldDefinitionResponseDto> {
    const form = await this.formRepo.findByIdWithFields(cmd.formId);
    if (!form) throw new FormNotFoundError(cmd.formId);

    FormAccessPolicy.assertHasPermission(form, 'manage', cmd.userPermissions);


    const field = form.updateField(cmd.fieldId, {
      label:            cmd.label,
      fieldType:        cmd.fieldType,
      mandatory:        cmd.mandatory,
      fieldOptions:     cmd.fieldOptions,
      isHidden:         cmd.isHidden,
      isEncrypted:      cmd.isEncrypted,
      sortOrder:        cmd.sortOrder,
      stepId:           cmd.stepId,
      stepName:         cmd.stepName,
      condition:        cmd.condition,
      dependentOptions: cmd.dependentOptions,
      viewPermissions:  cmd.viewPermissions,
      validationRules:  cmd.validationRules,
    });

    await this.formRepo.update(cmd.formId, form);

    const events = [...form.domainEvents];
    form.clearEvents();
    this.eventBus.publishAll(events);

    return FormFieldDefinitionResponseMapper.toDto(field);
  }
}
