import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { RetryJobCommand } from './retry-job.command';

@CommandHandler(RetryJobCommand)
@Injectable()
export class RetryJobHandler implements ICommandHandler<RetryJobCommand, void> {
  constructor(private readonly processing: QueueProcessingService) {}

  async execute({ jobId }: RetryJobCommand): Promise<void> {
    await this.processing.retryJob(jobId);
  }
}
