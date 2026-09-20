import type { Job, JobExecutionContext } from "../../presentation/dto/queue.dto";

/**
 * Contract every @QueueHandler class must implement.
 * TData is the typed Job class (e.g. CorrespondenceDispatchJob).
 */
export interface IQueueHandler<TData = unknown, TResult = unknown> {
  execute(job: Job<TData, TResult>, ctx: JobExecutionContext): Promise<TResult>;
}
