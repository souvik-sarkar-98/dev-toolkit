import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { QueueJob } from '../../../domain/aggregates/queue-job.aggregate';
import { IQueueJobRepository } from '../../../domain/repositories/queue-job.repository';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { QueueProcessorRegistry } from '../../../infrastructure/services/queue-processor-registry.service';
import { Job } from '../../../presentation/dto/queue.dto';
import { DispatchJobCommand } from './dispatch-job.command';

const DEFAULT_QUEUE_NAME = 'default';

@CommandHandler(DispatchJobCommand)
@Injectable()
export class DispatchJobHandler implements ICommandHandler<DispatchJobCommand, Job<any>> {
  private readonly logger = new Logger(DispatchJobHandler.name);

  constructor(
    private readonly processing: QueueProcessingService,
    private readonly registry: QueueProcessorRegistry,
    @Inject(IQueueJobRepository) private readonly jobRepo: IQueueJobRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ handlerName, payload, options }: DispatchJobCommand): Promise<Job<any>> {
    const handlerOpts = this.registry.getHandlerOptions(handlerName);
    const merged = {
      attempts: handlerOpts?.attempts,
      backoff:  handlerOpts?.backoff,
      priority: handlerOpts?.priority,
      ...options,
    };

    const bullJob = await this.processing.addJob(handlerName, payload, merged);

    if (bullJob.id) {
      const queueJob = QueueJob.enqueue({
        jobId:     bullJob.id,
        jobName:   handlerName,
        queueName: DEFAULT_QUEUE_NAME,
        payload,
      });

      void this.jobRepo.create(queueJob)
        .then(() => {
          const events = [...queueJob.domainEvents];
          queueJob.clearEvents();
          this.eventBus.publishAll(events);
        })
        .catch(err => this.logger.warn(`job log write failed for ${bullJob.id}: ${err?.message}`));
    }

    return bullJob;
  }
}
