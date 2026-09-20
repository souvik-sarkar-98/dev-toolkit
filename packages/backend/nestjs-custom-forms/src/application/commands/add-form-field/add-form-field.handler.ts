import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { FormNotFoundError } from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { FormKeyPolicy } from '../../../domain/policies/form-key.policy';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { FormFieldDefinitionResponseDto } from '../../dtos/response/form-response.dtos';
import { FormFieldDefinitionResponseMapper } from '../../mappers/form-field-definition-response.mapper';
import { AddFormFieldCommand } from './add-form-field.command';

@CommandHandler(AddFormFieldCommand)
@Injectable()
export class AddFormFieldHandler
  implements ICommandHandler<AddFormFieldCommand, FormFieldDefinitionResponseDto>
{
  constructor(
    @Inject(IFormRepository)
    private readonly formRepo: IFormRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: AddFormFieldCommand): Promise<FormFieldDefinitionResponseDto> {
    const form = await this.formRepo.findByIdWithFields(cmd.formId);
    if (!form) throw new FormNotFoundError(cmd.formId);

    FormAccessPolicy.assertHasPermission(form, 'manage', cmd.userPermissions);
    FormKeyPolicy.assertValidKey(cmd.key);


    const field = form.addField({
      key:              cmd.key,
      label:            cmd.label,
      fieldType:        cmd.fieldType,
      mandatory:        cmd.mandatory,
      fieldOptions:     cmd.fieldOptions,
      isHidden:         cmd.isHidden,
      isEncrypted:      cmd.isEncrypted,
      sortOrder:        cmd.sortOrder,
      stepId:           cmd.stepId ?? null,
      stepName:         cmd.stepName ?? null,
      condition:        cmd.condition,
      dependentOptions: cmd.dependentOptions,
      createdBy:        cmd.userId || undefined,
      viewPermissions:  cmd.viewPermissions,
      validationRules:  cmd.validationRules ?? null,
    });

    await this.formRepo.update(cmd.formId, form);

    const events = [...form.domainEvents];
    form.clearEvents();
    this.eventBus.publishAll(events);

    return FormFieldDefinitionResponseMapper.toDto(field);
  }
}
