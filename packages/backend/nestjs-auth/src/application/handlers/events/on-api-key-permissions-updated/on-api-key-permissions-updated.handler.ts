import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ApiKeyPermissionsUpdatedEvent } from '../../../../domain/events/api-key-permissions-updated.event';
import { IApiKeyVerifierPort } from '../../../ports/api-key-verifier.port';

@EventsHandler(ApiKeyPermissionsUpdatedEvent)
@Injectable()
export class OnApiKeyPermissionsUpdatedHandler
  implements IEventHandler<ApiKeyPermissionsUpdatedEvent>
{
  constructor(@Inject(IApiKeyVerifierPort) private readonly verifier: IApiKeyVerifierPort) {}

  async handle(event: ApiKeyPermissionsUpdatedEvent): Promise<void> {
    await this.verifier.invalidate(event.snapshot.keyId);
  }
}
