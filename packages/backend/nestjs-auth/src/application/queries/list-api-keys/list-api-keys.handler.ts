import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ListApiKeysQuery } from './list-api-keys.query';
import { IApiKeyRepository } from '../../../domain/repositories/api-key.repository';
import { ApiKeyResponseMapper } from '../../mappers/api-key-response.mapper';
import { BaseFilter, PagedResponse } from '@ssdev-toolkit/nestjs-core';
import { ApiKeyResponseDto } from '../../dtos/response/auth-response.dtos';
import { ApiKeyFilter } from '../../../domain/aggregates/api-key/api-key.aggregate';

@QueryHandler(ListApiKeysQuery)
@Injectable()
export class ListApiKeysHandler implements IQueryHandler<ListApiKeysQuery, PagedResponse<ApiKeyResponseDto>> {
  constructor(@Inject(IApiKeyRepository) private readonly repo: IApiKeyRepository) { }

  async execute(query: ListApiKeysQuery): Promise<PagedResponse<ApiKeyResponseDto>> {
    // Merge the caller's ownerId into the filter so each user only sees their own keys
    const scopedFilter = query.ownerId
      ? new BaseFilter<ApiKeyFilter>(
        { ...query.filter?.props, ownerId: query.ownerId },
        query.filter?.pageIndex,
        query.filter?.pageSize,
      )
      : query.filter;

    const paged = await this.repo.findPaged(scopedFilter);
    return new PagedResponse(
      paged.content.map((k) => ApiKeyResponseMapper.toDto(k)),
      paged.totalSize,
      paged.pageIndex,
      paged.pageSize,
    );
  }
}
