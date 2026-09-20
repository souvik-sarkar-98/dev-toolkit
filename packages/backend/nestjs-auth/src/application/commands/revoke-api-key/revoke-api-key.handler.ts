import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { RevokeApiKeyCommand } from './revoke-api-key.command';
import { IApiKeyRepository } from '../../../domain/repositories/api-key.repository';
import { ApiKeyNotFoundError } from '../../../domain/errors/auth.errors';

@CommandHandler(RevokeApiKeyCommand)
@Injectable()
export class RevokeApiKeyHandler implements ICommandHandler<RevokeApiKeyCommand, boolean> {
  constructor(
    @Inject(IApiKeyRepository) private readonly repo: IApiKeyRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RevokeApiKeyCommand): Promise<boolean> {
    const keyInfo = await this.repo.findById(command.apiKeyId);
    if (!keyInfo) throw new ApiKeyNotFoundError(command.apiKeyId);

    keyInfo.revoke();
    await this.repo.update(keyInfo.id, keyInfo);

    this.eventBus.publishAll([...keyInfo.domainEvents]);
    keyInfo.clearEvents();

    return true;
  }
}
