import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetRoleGroupQuery } from './get-role-group.query';
import { IRoleGroupRepository } from '../../../domain/repositories/role-group.repository';
import { RoleGroupResponseMapper } from '../../mappers/role-group-response.mapper';
import { RoleGroupNotFoundError } from '../../../domain/errors/auth.errors';
import { RoleGroupResponseDto } from '../../dtos/response/role-group-response.dto';

@QueryHandler(GetRoleGroupQuery)
@Injectable()
export class GetRoleGroupHandler implements IQueryHandler<GetRoleGroupQuery, RoleGroupResponseDto> {
  constructor(@Inject(IRoleGroupRepository) private readonly repo: IRoleGroupRepository) {}

  async execute(query: GetRoleGroupQuery): Promise<RoleGroupResponseDto> {
    const group = await this.repo.findWithRoles(query.key);
    if (!group) throw new RoleGroupNotFoundError(query.key);
    return RoleGroupResponseMapper.toDto(group);
  }
}
