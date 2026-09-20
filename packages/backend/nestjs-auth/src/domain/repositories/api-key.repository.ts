import { ApiKey, ApiKeyFilter } from '../aggregates/api-key/api-key.aggregate';
import { IRepository } from '@ssdev-toolkit/nestjs-core';

export const IApiKeyRepository = Symbol('IApiKeyRepository');

export interface IApiKeyRepository extends IRepository<ApiKey, string, ApiKeyFilter> {
  findByKeyId(keyId: string): Promise<ApiKey | null>;
}
