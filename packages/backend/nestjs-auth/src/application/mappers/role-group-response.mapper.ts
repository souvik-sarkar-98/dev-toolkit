import { RoleGroup } from '../../domain/aggregates/role-group/role-group.aggregate';
import { RoleGroupResponseDto } from '../dtos/response/role-group-response.dto';

export class RoleGroupResponseMapper {
  static toDto(group: RoleGroup): RoleGroupResponseDto {
    const dto = new RoleGroupResponseDto();
    dto.id = group.id;
    dto.key = group.key;
    dto.description = group.description;
    dto.isShadow = group.isShadow;
    dto.roleKeys = group.roleKeys;
    dto.createdAt = group.createdAt;
    return dto;
  }
}
