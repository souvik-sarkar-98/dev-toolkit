import { UserRole } from '../../domain/aggregates/user-role/user-role.aggregate';
import { UserRoleGroup } from '../../domain/aggregates/user-role-group/user-role-group.aggregate';
import { UserRoleResponseDto, UserRoleGroupResponseDto } from '../dtos/response/auth-response.dtos';

export class UserRoleResponseMapper {
  static toDto(userRole: UserRole): UserRoleResponseDto {
    const dto = new UserRoleResponseDto();
    dto.id = userRole.id;
    dto.idpSub = userRole.idpSub;
    dto.roleId = userRole.roleId;
    dto.roleKey = userRole.roleKey;
    dto.sourceGroupId = userRole.sourceGroupId;
    dto.entityId = userRole.entityId;
    dto.entityType = userRole.entityType;
    dto.grantedAt = userRole.grantedAt;
    dto.revokedAt = userRole.revokedAt;
    dto.grantedBy = userRole.grantedBy;
    dto.note = userRole.note;
    return dto;
  }

  static toGroupDto(membership: UserRoleGroup): UserRoleGroupResponseDto {
    const dto = new UserRoleGroupResponseDto();
    dto.id = membership.id;
    dto.idpSub = membership.idpSub;
    dto.groupId = membership.groupId;
    dto.groupKey = membership.groupKey;
    dto.entityId = membership.entityId;
    dto.entityType = membership.entityType;
    dto.grantedAt = membership.grantedAt;
    dto.revokedAt = membership.revokedAt;
    dto.grantedBy = membership.grantedBy;
    dto.revokedBy = membership.revokedBy;
    dto.note = membership.note;
    return dto;
  }
}
