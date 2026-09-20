import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GenerateApiKeyCommand } from './generate-api-key.command';
import { ApiKey } from '../../../domain/aggregates/api-key/api-key.aggregate';
import { IApiKeyRepository } from '../../../domain/repositories/api-key.repository';
import { ApiKeyPermissionsPolicy } from '../../../domain/policies/api-key-permissions.policy';
import { ApiKeyResponseMapper } from '../../mappers/api-key-response.mapper';
import { ApiKeyResponseDto } from '../../dtos/response/auth-response.dtos';

@CommandHandler(GenerateApiKeyCommand)
@Injectable()
export class GenerateApiKeyHandler
  implements ICommandHandler<GenerateApiKeyCommand, ApiKeyResponseDto>
{
  constructor(
    @Inject(IApiKeyRepository) private readonly repo: IApiKeyRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: GenerateApiKeyCommand): Promise<ApiKeyResponseDto> {
    const policy = new ApiKeyPermissionsPolicy();
    policy.assertCanDelegate(command.permissions, command.callerPermissions);

    const { keyInfo, token } = await ApiKey.create({
      name: command.name,
      permissions: command.permissions,
      expiresAt: command.expiresAt,
      createdBy: command.createdBy,
      ownerId: command.ownerId,
    });

    await this.repo.create(keyInfo);

    this.eventBus.publishAll([...keyInfo.domainEvents]);
    keyInfo.clearEvents();

    return ApiKeyResponseMapper.toDto(keyInfo, token);
  }
}
