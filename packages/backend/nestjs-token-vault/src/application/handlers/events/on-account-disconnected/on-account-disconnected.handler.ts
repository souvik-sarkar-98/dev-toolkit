import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { AccountDisconnectedEvent } from '../../../../domain/events/account-disconnected.event';

@EventsHandler(AccountDisconnectedEvent)
@Injectable()
export class OnAccountDisconnectedHandler implements IEventHandler<AccountDisconnectedEvent> {
  private readonly logger = new Logger(OnAccountDisconnectedHandler.name);

  handle(event: AccountDisconnectedEvent): void {
    this.logger.log(
      `[Audit] Account disconnected: accountId=${event.snapshot.id} ` +
      `provider=${event.snapshot.provider} email=${event.snapshot.email}`,
    );
  }
}
