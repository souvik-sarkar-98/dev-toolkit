import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IJsonDocumentRepository } from '../../../domain/repositories/json-document.repository';
import { JsonDocumentResponseDto } from '../../dtos/json-document.dtos';
import { JsonDocumentResponseMapper } from '../../mappers/json-document-response.mapper';
import { ListJsonDocumentsQuery } from './list-json-documents.query';

@QueryHandler(ListJsonDocumentsQuery)
@Injectable()
export class ListJsonDocumentsHandler
  implements IQueryHandler<ListJsonDocumentsQuery, JsonDocumentResponseDto[]>
{
  constructor(
    @Inject(IJsonDocumentRepository)
    private readonly repo: IJsonDocumentRepository,
  ) {}

  async execute({ params }: ListJsonDocumentsQuery): Promise<JsonDocumentResponseDto[]> {
    const documents = params.namespace
      ? await this.repo.findByNamespace(params.namespace)
      : await this.repo.findAll();

    return documents.map((d) => JsonDocumentResponseMapper.toDto(d));
  }
}
