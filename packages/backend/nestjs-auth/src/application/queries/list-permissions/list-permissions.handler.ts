import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ListPermissionsQuery } from './list-permissions.query';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository';
import { PermissionResponseMapper } from '../../mappers/permission-response.mapper';
import { PagedResponse } from '@ssdev-toolkit/nestjs-core';
import { PermissionResponseDto } from '../../dtos/response/auth-response.dtos';

@QueryHandler(ListPermissionsQuery)
@Injectable()
export class ListPermissionsHandler implements IQueryHandler<ListPermissionsQuery, PagedResponse<PermissionResponseDto>> {
  constructor(@Inject(IPermissionRepository) private readonly repo: IPermissionRepository) { }

  async execute(query: ListPermissionsQuery): Promise<PagedResponse<PermissionResponseDto>> {
    const activeFilter = {
      ...query.filter,
      props: { ...query.filter?.props, isActive: query.filter?.props?.isActive ?? true },
    };
    const paged = await this.repo.findPaged(activeFilter);
    return new PagedResponse(
      paged.content.map((p) => PermissionResponseMapper.toDto(p)),
      paged.totalSize,
      paged.pageIndex,
      paged.pageSize,
    );
  }
}
