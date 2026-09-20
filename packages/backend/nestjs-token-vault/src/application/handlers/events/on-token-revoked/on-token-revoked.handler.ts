import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { TokenRevokedEvent } from '../../../../domain/events/token-revoked.event';

@EventsHandler(TokenRevokedEvent)
@Injectable()
export class OnTokenRevokedHandler implements IEventHandler<TokenRevokedEvent> {
  private readonly logger = new Logger(OnTokenRevokedHandler.name);

  handle(event: TokenRevokedEvent): void {
    this.logger.log(
      `[Audit] Token revoked: tokenId=${event.snapshot.id} ` +
      `provider=${event.snapshot.provider} email=${event.snapshot.email}`,
    );
  }
}
