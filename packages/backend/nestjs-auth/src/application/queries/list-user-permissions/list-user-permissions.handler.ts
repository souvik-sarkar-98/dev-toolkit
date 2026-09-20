import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ListUserPermissionsQuery } from './list-user-permissions.query';
import { IUserPermissionRepository } from '../../../domain/repositories/user-permission.repository';
import { UserPermissionResponseMapper } from '../../mappers/user-permission-response.mapper';
import { UserPermissionResponseDto } from '../../dtos/response/auth-response.dtos';

@QueryHandler(ListUserPermissionsQuery)
@Injectable()
export class ListUserPermissionsHandler
  implements IQueryHandler<ListUserPermissionsQuery, UserPermissionResponseDto[]>
{
  constructor(
    @Inject(IUserPermissionRepository) private readonly repo: IUserPermissionRepository,
  ) {}

  async execute(query: ListUserPermissionsQuery): Promise<UserPermissionResponseDto[]> {
    const grants = query.activeOnly
      ? await this.repo.findActiveByIdPSub(query.idpSub)
      : await this.repo.findAll({ idpSub: query.idpSub });
    return grants.map((g) => UserPermissionResponseMapper.toDto(g));
  }
}
