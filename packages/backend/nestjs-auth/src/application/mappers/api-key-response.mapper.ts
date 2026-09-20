import { ApiKey } from '../../domain/aggregates/api-key/api-key.aggregate';
import { ApiKeyResponseDto } from '../dtos/response/auth-response.dtos';

export class ApiKeyResponseMapper {
  static toDto(apiKey: ApiKey, token?: string): ApiKeyResponseDto {
    const dto = new ApiKeyResponseDto();
    dto.id = apiKey.id;
    dto.name = apiKey.name;
    dto.permissions = apiKey.permissions;
    dto.expiresAt = apiKey.expiresAt;
    dto.lastUsedAt = apiKey.lastUsedAt;
    dto.ownerId = apiKey.ownerId;
    dto.createdBy = apiKey.createdBy;
    dto.createdAt = apiKey.createdAt;
    dto.updatedAt = apiKey.updatedAt;
    if (token) dto.token = token;
    return dto;
  }
}
