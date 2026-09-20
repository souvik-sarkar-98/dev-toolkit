import { Role } from '../../domain/aggregates/role/role.aggregate';
import { RoleResponseDto } from '../dtos/response/auth-response.dtos';

export class RoleResponseMapper {
  static toDto(role: Role): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.key = role.key;
    dto.description = role.description;
    dto.isShadow = role.isShadow;
    dto.permissionKeys = role.permissionKeys;
    dto.createdAt = role.createdAt;
    return dto;
  }
}
