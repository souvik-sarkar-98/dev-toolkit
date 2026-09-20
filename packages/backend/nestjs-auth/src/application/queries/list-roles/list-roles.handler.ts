import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ListRolesQuery } from './list-roles.query';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { RoleResponseMapper } from '../../mappers/role-response.mapper';
import { PagedResponse } from '@ssdev-toolkit/nestjs-core';
import { RoleResponseDto } from '../../dtos/response/auth-response.dtos';

@QueryHandler(ListRolesQuery)
@Injectable()
export class ListRolesHandler implements IQueryHandler<ListRolesQuery, PagedResponse<RoleResponseDto>> {
  constructor(@Inject(IRoleRepository) private readonly repo: IRoleRepository) { }

  async execute(query: ListRolesQuery): Promise<PagedResponse<RoleResponseDto>> {
    const props = query.filter?.props ?? {};
    const activeFilter = {
      ...query.filter,
      props: {
        ...props,
        isActive: props.isActive ?? true,
      },
    };
    const paged = await this.repo.findPaged(activeFilter);
    return new PagedResponse(paged.content.map((r) => RoleResponseMapper.toDto(r)), paged.totalSize, paged.pageIndex, paged.pageSize);
  }
}
