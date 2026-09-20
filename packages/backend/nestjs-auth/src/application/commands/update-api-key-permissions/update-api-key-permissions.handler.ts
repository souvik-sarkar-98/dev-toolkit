import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateApiKeyPermissionsCommand } from './update-api-key-permissions.command';
import { IApiKeyRepository } from '../../../domain/repositories/api-key.repository';
import { ApiKeyNotFoundError } from '../../../domain/errors/auth.errors';
import { ApiKeyPermissionsPolicy } from '../../../domain/policies/api-key-permissions.policy';
import { ApiKeyResponseMapper } from '../../mappers/api-key-response.mapper';
import { ApiKeyResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(UpdateApiKeyPermissionsCommand)
@Injectable()
export class UpdateApiKeyPermissionsHandler
  implements ICommandHandler<UpdateApiKeyPermissionsCommand, ApiKeyResponseDto>
{
  constructor(
    @Inject(IApiKeyRepository) private readonly repo: IApiKeyRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateApiKeyPermissionsCommand): Promise<ApiKeyResponseDto> {

    const keyInfo = await this.repo.findById(command.apiKeyId);
    if (!keyInfo) throw new ApiKeyNotFoundError(command.apiKeyId);

    if (keyInfo.ownerId) {
      const policy = new ApiKeyPermissionsPolicy();
      policy.assertCanDelegate(command.permissions, command.callerPermissions);
    }
    
    keyInfo.updatePermissions(command.permissions);
    await this.repo.update(keyInfo.id, keyInfo);

    this.eventBus.publishAll([...keyInfo.domainEvents]);
    keyInfo.clearEvents();

    return ApiKeyResponseMapper.toDto(keyInfo);
  }
}
