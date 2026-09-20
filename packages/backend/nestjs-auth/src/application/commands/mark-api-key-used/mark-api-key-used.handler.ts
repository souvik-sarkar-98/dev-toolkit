import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { MarkApiKeyUsedCommand } from './mark-api-key-used.command';
import { IApiKeyRepository } from '../../../domain/repositories/api-key.repository';

@CommandHandler(MarkApiKeyUsedCommand)
@Injectable()
export class MarkApiKeyUsedHandler implements ICommandHandler<MarkApiKeyUsedCommand> {
  constructor(
    @Inject(IApiKeyRepository) private readonly repo: IApiKeyRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkApiKeyUsedCommand): Promise<void> {
    const keyInfo = await this.repo.findById(command.apiKeyId);
    if (!keyInfo) return;

    keyInfo.used();
    await this.repo.update(keyInfo.id, keyInfo);

    this.eventBus.publishAll([...keyInfo.domainEvents]);
    keyInfo.clearEvents();
  }
}
