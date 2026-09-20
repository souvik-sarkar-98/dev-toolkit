import { Permission } from '../../domain/aggregates/permission/permission.aggregate';
import { PermissionResponseDto } from '../dtos/response/auth-response.dtos';

export class PermissionResponseMapper {
  static toDto(permission: Permission): PermissionResponseDto {
    const dto = new PermissionResponseDto();
    dto.id = permission.id;
    dto.key = permission.key;
    dto.description = permission.description;
    dto.createdAt = permission.createdAt;
    return dto;
  }
}
