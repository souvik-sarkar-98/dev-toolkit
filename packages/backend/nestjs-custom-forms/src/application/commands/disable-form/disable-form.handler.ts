import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { FormNotFoundError } from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { FormResponseDto } from '../../dtos/response/form-response.dtos';
import { FormResponseMapper } from '../../mappers/form-response.mapper';
import { DisableFormCommand } from './disable-form.command';

@CommandHandler(DisableFormCommand)
@Injectable()
export class DisableFormHandler implements ICommandHandler<DisableFormCommand, FormResponseDto> {
  constructor(
    @Inject(IFormRepository)
    private readonly formRepo: IFormRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: DisableFormCommand): Promise<FormResponseDto> {
    const form = await this.formRepo.findById(cmd.formId);
    if (!form) throw new FormNotFoundError(cmd.formId);

    FormAccessPolicy.assertHasPermission(form, 'manage', cmd.userPermissions);


    form.disable(cmd.userId || undefined);

    await this.formRepo.update(cmd.formId, form);

    const events = [...form.domainEvents];
    form.clearEvents();
    this.eventBus.publishAll(events);

    return FormResponseMapper.toDto(form);
  }
}
