import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ApiKeyRevokedEvent } from '../../../../domain/events/api-key-revoked.event';
import { IApiKeyVerifierPort } from '../../../ports/api-key-verifier.port';

@EventsHandler(ApiKeyRevokedEvent)
@Injectable()
export class OnApiKeyRevokedHandler implements IEventHandler<ApiKeyRevokedEvent> {
  constructor(@Inject(IApiKeyVerifierPort) private readonly verifier: IApiKeyVerifierPort) {}

  async handle(event: ApiKeyRevokedEvent): Promise<void> {
    await this.verifier.invalidate(event.snapshot.keyId);
  }
}
