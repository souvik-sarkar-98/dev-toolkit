import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetPermissionQuery } from './get-permission.query';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository';
import { PermissionResponseMapper } from '../../mappers/permission-response.mapper';
import { PermissionNotFoundError } from '../../../domain/errors/auth.errors';
import { PermissionResponseDto } from '../../dtos/response/auth-response.dtos';

@QueryHandler(GetPermissionQuery)
@Injectable()
export class GetPermissionHandler implements IQueryHandler<GetPermissionQuery, PermissionResponseDto> {
  constructor(@Inject(IPermissionRepository) private readonly repo: IPermissionRepository) {}

  async execute(query: GetPermissionQuery): Promise<PermissionResponseDto> {
    const perm = await this.repo.findByKey(query.key);
    if (!perm) throw new PermissionNotFoundError(query.key);
    return PermissionResponseMapper.toDto(perm);
  }
}
