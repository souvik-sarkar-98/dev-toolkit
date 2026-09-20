import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetRoleQuery } from './get-role.query';
import { IRoleRepository } from '../../../domain/repositories/role.repository';
import { RoleResponseMapper } from '../../mappers/role-response.mapper';
import { RoleNotFoundError } from '../../../domain/errors/auth.errors';
import { RoleResponseDto } from '../../dtos/response/auth-response.dtos';

@QueryHandler(GetRoleQuery)
@Injectable()
export class GetRoleHandler implements IQueryHandler<GetRoleQuery, RoleResponseDto> {
  constructor(@Inject(IRoleRepository) private readonly repo: IRoleRepository) {}

  async execute(query: GetRoleQuery): Promise<RoleResponseDto> {
    const role = await this.repo.findWithPermissions(query.key);
    if (!role) throw new RoleNotFoundError(query.key);
    return RoleResponseMapper.toDto(role);
  }
}
