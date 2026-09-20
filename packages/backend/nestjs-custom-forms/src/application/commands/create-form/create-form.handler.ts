import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { Form } from '../../../domain/aggregates/form/form.aggregate';
import { FormKeyAlreadyExistsError } from '../../../domain/errors/form.errors';
import { FormKeyPolicy } from '../../../domain/policies/form-key.policy';
import { ICustomFormEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { CUSTOM_FORMS_OPTIONS } from '../../../infrastructure/custom-forms-options.token';
import { CustomFormsModuleOptions } from '../../../custom-forms.schema';
import { FormResponseDto } from '../../dtos/response/form-response.dtos';
import { FormResponseMapper } from '../../mappers/form-response.mapper';
import { assertCustomFormEntityAccess } from '../../utilities/custom-form-entity-access.util';
import { CreateFormCommand } from './create-form.command';

@CommandHandler(CreateFormCommand)
@Injectable()
export class CreateFormHandler implements ICommandHandler<CreateFormCommand, FormResponseDto> {
  constructor(
    @Inject(IFormRepository)
    private readonly formRepo: IFormRepository,
    @Inject(CUSTOM_FORMS_OPTIONS)
    private readonly options: CustomFormsModuleOptions,
    @Optional()
    @Inject(ICustomFormEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: CreateFormCommand): Promise<FormResponseDto> {
    await assertCustomFormEntityAccess(this.options, this.accessPort, {
      entityType: cmd.entityType,
      userId: cmd.userId,
      userPermissions: cmd.userPermissions,
      action: 'write',
    });
    FormKeyPolicy.assertValidKey(cmd.key);

    const existing = await this.formRepo.findByKey(cmd.entityType, cmd.key);
    if (existing) throw new FormKeyAlreadyExistsError(cmd.key, cmd.entityType);

    const form = Form.create({
      entityType:        cmd.entityType,
      key:               cmd.key,
      label:             cmd.label,
      description:       cmd.description,
      managePermissions: cmd.managePermissions,
      readPermissions:   cmd.readPermissions,
      writePermissions:  cmd.writePermissions,
      createdBy:         cmd.userId || undefined,
    });

    await this.formRepo.create(form);

    const events = [...form.domainEvents];
    form.clearEvents();
    this.eventBus.publishAll(events);

    return FormResponseMapper.toDto(form);
  }
}
