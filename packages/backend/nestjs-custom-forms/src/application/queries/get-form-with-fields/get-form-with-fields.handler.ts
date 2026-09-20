import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FormNotFoundError } from '../../../domain/errors/form.errors';
import { FormAccessPolicy } from '../../../domain/policies/form-access.policy';
import { IFormRepository } from '../../../domain/repositories/form.repository';
import { FormResponseDto } from '../../dtos/response/form-response.dtos';
import { FormResponseMapper } from '../../mappers/form-response.mapper';
import { GetFormWithFieldsQuery } from './get-form-with-fields.query';

@QueryHandler(GetFormWithFieldsQuery)
@Injectable()
export class GetFormWithFieldsHandler
  implements IQueryHandler<GetFormWithFieldsQuery, FormResponseDto>
{
  constructor(
    @Inject(IFormRepository)
    private readonly formRepo: IFormRepository,
  ) {}

  async execute(query: GetFormWithFieldsQuery): Promise<FormResponseDto> {
    const form = await this.formRepo.findByIdWithFields(query.formId);
    if (!form) throw new FormNotFoundError(query.formId);

    FormAccessPolicy.assertHasPermission(form, 'read', query.userPermissions);

    return FormResponseMapper.toDto(form, { includeFields: true });
  }
}
