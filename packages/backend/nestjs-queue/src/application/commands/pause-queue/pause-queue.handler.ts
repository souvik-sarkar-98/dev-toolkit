import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { PauseQueueCommand } from './pause-queue.command';

@CommandHandler(PauseQueueCommand)
@Injectable()
export class PauseQueueHandler implements ICommandHandler<PauseQueueCommand, void> {
  constructor(private readonly processing: QueueProcessingService) {}

  async execute(): Promise<void> {
    await this.processing.pauseQueue();
  }
}
