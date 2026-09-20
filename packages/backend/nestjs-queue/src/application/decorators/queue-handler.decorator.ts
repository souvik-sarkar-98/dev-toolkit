import { Injectable, SetMetadata } from "@nestjs/common";

export const QUEUE_HANDLER_METADATA = "queue_handler_metadata";

export interface QueueHandlerOptions {
  attempts?: number;
  backoff?: { type: "fixed" | "exponential"; delay: number };
  timeout?: number;
  priority?: number;
  onRetry?: (attemptNumber: number, error: Error) => void | Promise<void>;
  onFailed?: (error: Error, attemptsMade: number) => void | Promise<void>;
}

/**
 * Class-level decorator that marks a class as a BullMQ job handler.
 *
 * Absorbs @Injectable() so consuming handler classes need only this one decorator.
 * The jobClass constructor name becomes the stable BullMQ job name.
 *
 * @example
 * @QueueHandler(CorrespondenceDispatchJob, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
 * export class CorrespondenceDispatchHandler implements IQueueHandler<CorrespondenceDispatchJob> {
 *   async execute(job: Job<CorrespondenceDispatchJob>, ctx: JobExecutionContext) { ... }
 * }
 */
export const QueueHandler = (
  jobClass: new (...args: any[]) => any,
  options?: QueueHandlerOptions,
): ClassDecorator => {
  return (target: Function) => {
    Injectable()(target);
    SetMetadata(QUEUE_HANDLER_METADATA, { jobClass, options: options ?? {} })(
      target,
    );
  };
};
