import { Inject, Injectable, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import {
  FormDisabledError,
  FormNotFoundError,
} from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { FormPolicy } from '../../../domain/policies/form.policy';
import { ICustomFormEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { FormStatus } from '../../../domain/enums/form-status.enum';
import { CUSTOM_FORMS_OPTIONS } from '../../../infrastructure/custom-forms-options.token';
import { CustomFormsModuleOptions } from '../../../custom-forms.schema';
import { FormResponseDto } from '../../dtos/response/form-response.dtos';
import { FormResponseMapper } from '../../mappers/form-response.mapper';
import { assertCustomFormEntityAccess } from '../../utilities/custom-form-entity-access.util';
import { GetPublishedFormByKeyQuery } from './get-published-form-by-key.query';

@QueryHandler(GetPublishedFormByKeyQuery)
@Injectable()
export class GetPublishedFormByKeyHandler
  implements IQueryHandler<GetPublishedFormByKeyQuery, FormResponseDto>
{
  constructor(
    @Inject(IFormRepository)
    private readonly formRepo: IFormRepository,
    @Inject(CUSTOM_FORMS_OPTIONS)
    private readonly options: CustomFormsModuleOptions,
    @Optional()
    @Inject(ICustomFormEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) {}

  async execute(query: GetPublishedFormByKeyQuery): Promise<FormResponseDto> {
    await assertCustomFormEntityAccess(this.options, this.accessPort, {
      entityType: query.entityType,
      userId: query.userId,
      userPermissions: query.userPermissions,
      action: 'read',
    });

    const form = await this.formRepo.findByKey(query.entityType, query.key);
    if (!form || form.status === FormStatus.Disabled) {
      throw new FormNotFoundError(query.key);
    }
    if (form.status !== FormStatus.Published) {
      throw new FormDisabledError(form.id);
    }

    FormAccessPolicy.assertHasPermission(form, 'read', query.userPermissions);

    return FormResponseMapper.toDto(form, { includeFields: true });
  }
}
