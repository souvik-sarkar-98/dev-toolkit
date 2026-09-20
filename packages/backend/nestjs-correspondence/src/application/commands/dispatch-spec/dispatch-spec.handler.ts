import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DispatchSpecCommand } from './dispatch-spec.command';
import { CorrespondenceOrchestrator } from '../../dispatch/correspondence-orchestrator';

@CommandHandler(DispatchSpecCommand)
export class DispatchSpecHandler implements ICommandHandler<DispatchSpecCommand> {
  constructor(private readonly orchestrator: CorrespondenceOrchestrator) {}

  async execute(command: DispatchSpecCommand): Promise<void> {
    await this.orchestrator.dispatch(command.spec);
  }
}
