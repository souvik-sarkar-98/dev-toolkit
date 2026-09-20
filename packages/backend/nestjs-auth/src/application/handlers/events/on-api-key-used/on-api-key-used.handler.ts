import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { ApiKeyUsedEvent } from '../../../../domain/events/api-key-used.event';

@EventsHandler(ApiKeyUsedEvent)
@Injectable()
export class OnApiKeyUsedHandler implements IEventHandler<ApiKeyUsedEvent> {
  // Persistence is already handled by MarkApiKeyUsedHandler before this event fires.
  // This handler is the correct extension point for future side effects
  // (e.g. audit logging, usage metrics) without touching the command handler.
  handle(_event: ApiKeyUsedEvent): void {}
}
