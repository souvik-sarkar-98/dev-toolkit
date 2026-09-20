import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { TokenRefreshedEvent } from '../../../../domain/events/token-refreshed.event';

@EventsHandler(TokenRefreshedEvent)
@Injectable()
export class OnTokenRefreshedHandler implements IEventHandler<TokenRefreshedEvent> {
  private readonly logger = new Logger(OnTokenRefreshedHandler.name);

  handle(event: TokenRefreshedEvent): void {
    this.logger.log(
      `[Audit] Token refreshed: tokenId=${event.snapshot.id} ` +
      `provider=${event.snapshot.provider} email=${event.snapshot.email} ` +
      `expiresAt=${event.snapshot.expiresAt ?? 'n/a'}`,
    );
  }
}
