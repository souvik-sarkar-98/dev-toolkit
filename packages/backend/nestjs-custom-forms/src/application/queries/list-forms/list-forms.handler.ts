import { Inject, Injectable, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { ICustomFormEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { CUSTOM_FORMS_OPTIONS } from '../../../infrastructure/custom-forms-options.token';
import { CustomFormsModuleOptions } from '../../../custom-forms.schema';
import { FormResponseDto } from '../../dtos/response/form-response.dtos';
import { FormResponseMapper } from '../../mappers/form-response.mapper';
import { assertCustomFormEntityAccess } from '../../utilities/custom-form-entity-access.util';
import { ListFormsQuery } from './list-forms.query';

@QueryHandler(ListFormsQuery)
@Injectable()
export class ListFormsHandler implements IQueryHandler<ListFormsQuery, FormResponseDto[]> {
  constructor(
    @Inject(IFormRepository)
    private readonly formRepo: IFormRepository,
    @Inject(CUSTOM_FORMS_OPTIONS)
    private readonly options: CustomFormsModuleOptions,
    @Optional()
    @Inject(ICustomFormEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) {}

  async execute(query: ListFormsQuery): Promise<FormResponseDto[]> {
    if (query.entityType) {
      await assertCustomFormEntityAccess(this.options, this.accessPort, {
        entityType: query.entityType,
        userId: query.userId,
        userPermissions: query.userPermissions,
        action: 'read',
      });
    }

    const forms = query.entityType
      ? await this.formRepo.findByEntityType(query.entityType, {
          status: query.status,
          includeDisabled: query.status === undefined,
        })
      : await this.formRepo.findAll({
          entityType: query.entityType,
          status:     query.status,
        });

    return forms
      .filter((form) => {
        try {
          FormAccessPolicy.assertHasPermission(form, 'read', query.userPermissions);
          return true;
        } catch {
          return false;
        }
      })
      .map((form) => FormResponseMapper.toDto(form));
  }
}
