import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { ResumeQueueCommand } from './resume-queue.command';

@CommandHandler(ResumeQueueCommand)
@Injectable()
export class ResumeQueueHandler implements ICommandHandler<ResumeQueueCommand, void> {
  constructor(private readonly processing: QueueProcessingService) {}

  async execute(): Promise<void> {
    await this.processing.resumeQueue();
  }
}
