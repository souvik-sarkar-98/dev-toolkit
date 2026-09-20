import { AuthUser } from "../models/auth-user";
import { CurrentUserResponseDto } from "../dtos/response/auth-response.dtos";

export function mapAuthUserToResponse(authUser: AuthUser): CurrentUserResponseDto {

    return {
        type: authUser.type,
        idpSub: authUser.idpSub,
        id: authUser.userId,
        firstName: authUser.userInfo?.firstName,
        lastName: authUser.userInfo?.lastName,
        fullName: authUser.userInfo?.fullName,
        email: authUser.email,
        permissions: authUser.permissions,
        userRoles: authUser.userRoles,
        roleGroups: authUser.roleGroups,
        idpClaims: authUser.idpClaims,
        phoneNo: authUser.userInfo?.phoneNo,
        scopedAccess: authUser.scopedAccess?.map((scopedRole) => {
            return {
                entityId: scopedRole.entityId,
                entityType: scopedRole.entityType,
                permissions: scopedRole.permissions,
                userRoles: scopedRole.userRoles,
                roleGroups: scopedRole.roleGroups,
            };
        }) ?? [],
        attributes: authUser.userInfo
    }; 
}