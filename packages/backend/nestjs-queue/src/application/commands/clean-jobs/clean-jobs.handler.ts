import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { CleanJobsCommand } from './clean-jobs.command';

@CommandHandler(CleanJobsCommand)
@Injectable()
export class CleanJobsHandler
  implements ICommandHandler<CleanJobsCommand, { completed: string[]; failed: string[] }>
{
  constructor(private readonly processing: QueueProcessingService) {}

  async execute(): Promise<{ completed: string[]; failed: string[] }> {
    return this.processing.cleanJobs();
  }
}
