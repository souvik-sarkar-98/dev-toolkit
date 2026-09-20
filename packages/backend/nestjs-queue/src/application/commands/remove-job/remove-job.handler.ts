import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { RemoveJobCommand } from './remove-job.command';

@CommandHandler(RemoveJobCommand)
@Injectable()
export class RemoveJobHandler implements ICommandHandler<RemoveJobCommand, void> {
  constructor(private readonly processing: QueueProcessingService) {}

  async execute({ jobId }: RemoveJobCommand): Promise<void> {
    await this.processing.removeJob(jobId);
  }
}
