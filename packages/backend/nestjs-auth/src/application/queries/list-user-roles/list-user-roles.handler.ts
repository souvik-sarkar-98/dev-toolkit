import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ListUserRolesQuery } from './list-user-roles.query';
import { IUserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { UserRoleResponseMapper } from '../../mappers/user-role-response.mapper';
import { UserRoleResponseDto } from '../../dtos/response/auth-response.dtos';

@QueryHandler(ListUserRolesQuery)
@Injectable()
export class ListUserRolesHandler implements IQueryHandler<ListUserRolesQuery, UserRoleResponseDto[]> {
  constructor(@Inject(IUserRoleRepository) private readonly repo: IUserRoleRepository) {}

  async execute(query: ListUserRolesQuery): Promise<UserRoleResponseDto[]> {
    const roles = query.activeOnly
      ? await this.repo.findActiveByIdPSub(query.idpSub)
      : await this.repo.findAll({ idpSub: query.idpSub });
    return roles.map((r) => UserRoleResponseMapper.toDto(r));
  }
}
