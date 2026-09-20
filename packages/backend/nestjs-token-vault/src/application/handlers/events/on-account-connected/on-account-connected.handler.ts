import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { AccountConnectedEvent } from '../../../../domain/events/account-connected.event';

@EventsHandler(AccountConnectedEvent)
@Injectable()
export class OnAccountConnectedHandler implements IEventHandler<AccountConnectedEvent> {
  private readonly logger = new Logger(OnAccountConnectedHandler.name);

  handle(event: AccountConnectedEvent): void {
    this.logger.log(
      `[Audit] Account connected: accountId=${event.snapshot.id} ` +
      `provider=${event.snapshot.provider} email=${event.snapshot.email}`,
    );
  }
}
