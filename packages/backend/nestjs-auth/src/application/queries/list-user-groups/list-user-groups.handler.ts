import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ListUserGroupsQuery } from './list-user-groups.query';
import { IUserRoleGroupRepository } from '../../../domain/repositories/user-role-group.repository';
import { UserRoleResponseMapper } from '../../mappers/user-role-response.mapper';
import { UserRoleGroupResponseDto } from '../../dtos/response/auth-response.dtos';

@QueryHandler(ListUserGroupsQuery)
@Injectable()
export class ListUserGroupsHandler implements IQueryHandler<ListUserGroupsQuery, UserRoleGroupResponseDto[]> {
  constructor(@Inject(IUserRoleGroupRepository) private readonly repo: IUserRoleGroupRepository) {}

  async execute(query: ListUserGroupsQuery): Promise<UserRoleGroupResponseDto[]> {
    const groups = query.activeOnly
      ? await this.repo.findActiveByIdPSub(query.idpSub)
      : await this.repo.findAll({ idpSub: query.idpSub });
    return groups.map((g) => UserRoleResponseMapper.toGroupDto(g));
  }
}
