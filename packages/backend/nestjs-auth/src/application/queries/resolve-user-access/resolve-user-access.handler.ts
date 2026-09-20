import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ResolveUserAccessQuery } from './resolve-user-access.query';
import { IUserAccessPort } from '../../ports/user-access.port';
import { RbacResponseDto } from '../../dtos/response/auth-response.dtos';

@QueryHandler(ResolveUserAccessQuery)
@Injectable()
export class ResolveUserAccessHandler
  implements IQueryHandler<ResolveUserAccessQuery, RbacResponseDto>
{
  constructor(@Inject(IUserAccessPort) private readonly userAccess: IUserAccessPort) {}

  async execute(query: ResolveUserAccessQuery): Promise<RbacResponseDto> {
    const authUser = await this.userAccess.resolve(query.idpSub);
    const dto = new RbacResponseDto();
    dto.permissions = authUser.permissions ?? [];
    dto.userRoles = authUser.userRoles ?? [];
    dto.roleGroups = authUser.roleGroups ?? [];
    dto.scopedAccess = authUser.scopedAccess;
    return dto;
  }
}
