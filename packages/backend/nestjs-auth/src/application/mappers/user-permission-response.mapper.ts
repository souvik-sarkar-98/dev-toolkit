import { UserPermission } from '../../domain/aggregates/user-permission/user-permission.aggregate';
import { UserPermissionResponseDto } from '../dtos/response/auth-response.dtos';

export class UserPermissionResponseMapper {
  static toDto(grant: UserPermission): UserPermissionResponseDto {
    const dto = new UserPermissionResponseDto();
    dto.id = grant.id;
    dto.idpSub = grant.idpSub;
    dto.permissionId = grant.permissionId;
    dto.permissionKey = grant.permissionKey;
    dto.entityId = grant.entityId;
    dto.entityType = grant.entityType;
    dto.grantedAt = grant.grantedAt;
    dto.revokedAt = grant.revokedAt;
    dto.grantedBy = grant.grantedBy;
    dto.note = grant.note;
    return dto;
  }
}
