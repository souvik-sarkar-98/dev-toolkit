import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { NotificationSpec } from '../model/notification-spec';
import { DispatchSpecCommand } from '../commands/dispatch-spec/dispatch-spec.command';

/**
 * Cross-boundary write entry point for correspondence. The caller builds a
 * NotificationSpec (e.g. a host adapter implementing another module's outbound
 * notification port, or a cron job) and dispatches it through the CommandBus
 * (facade -> command -> handler -> orchestrator).
 */
@Injectable()
export class CorrespondenceFacade {
  constructor(private readonly commandBus: CommandBus) {}

  dispatch(spec: NotificationSpec): Promise<void> {
    return this.commandBus.execute(new DispatchSpecCommand(spec));
  }
}
