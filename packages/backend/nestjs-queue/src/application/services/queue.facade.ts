import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { DispatchJobCommand } from '../commands/dispatch-job/dispatch-job.command';
import { Job, JobOptions } from '../../presentation/dto/queue.dto';

/**
 * Primary programmatic entry point for QueueModule consumers.
 * Replaces QueueBus — dispatches jobs via the CQRS CommandBus.
 *
 * @example
 * // Typed job class instance — handler name derived from constructor
 * await this.queueFacade.dispatch(new SendEmailJob(payload), { jobId: uuid });
 *
 * @example
 * // Explicit handler name string + plain payload (cron / dynamic dispatch)
 * await this.queueFacade.dispatch('SendEmailJob', payload, { jobId });
 */
@Injectable()
export class QueueFacade {
  constructor(private readonly commandBus: CommandBus) {}

  dispatch<T extends object>(job: T, options?: JobOptions): Promise<Job<T>>;
  dispatch(handlerName: string, payload: Record<string, any>, options?: JobOptions): Promise<Job<Record<string, any>>>;

  dispatch(
    jobOrName: object | string,
    payloadOrOptions?: Record<string, any> | JobOptions,
    options?: JobOptions,
  ): Promise<Job<any>> {
    if (typeof jobOrName === 'string') {
      return this.commandBus.execute(
        new DispatchJobCommand(jobOrName, (payloadOrOptions as Record<string, any>) ?? {}, options),
      );
    }
    return this.commandBus.execute(
      new DispatchJobCommand(
        jobOrName.constructor.name,
        jobOrName as Record<string, any>,
        payloadOrOptions as JobOptions,
      ),
    );
  }
}
