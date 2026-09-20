import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { JsonDocumentKeyNotFoundError, JsonDocumentNotFoundError } from '../../../domain/errors/json-store.errors';
import { IJsonDocumentRepository } from '../../../domain/repositories/json-document.repository';
import { JsonDocumentResponseDto } from '../../dtos/json-document.dtos';
import { JsonDocumentResponseMapper } from '../../mappers/json-document-response.mapper';
import { GetJsonDocumentQuery } from './get-json-document.query';

@QueryHandler(GetJsonDocumentQuery)
@Injectable()
export class GetJsonDocumentHandler
  implements IQueryHandler<GetJsonDocumentQuery, JsonDocumentResponseDto>
{
  constructor(
    @Inject(IJsonDocumentRepository)
    private readonly repo: IJsonDocumentRepository,
  ) {}

  async execute({ params }: GetJsonDocumentQuery): Promise<JsonDocumentResponseDto> {
    if (params.id) {
      const document = await this.repo.findById(params.id);
      if (!document) throw new JsonDocumentNotFoundError(params.id);
      return JsonDocumentResponseMapper.toDto(document);
    }

    const document = await this.repo.findByKey(params.key!, params.namespace!);
    if (!document) throw new JsonDocumentKeyNotFoundError(params.key!, params.namespace!);
    return JsonDocumentResponseMapper.toDto(document);
  }
}
