import { CorrespondenceDispatchPayload } from '../../domain/ports/dispatch-queue.port';

/**
 * Job class dispatched to the QueueBus for asynchronous correspondence processing.
 * The class name is the stable BullMQ job name.
 */
export class CorrespondenceDispatchJob {
  constructor(public readonly payload: CorrespondenceDispatchPayload) {}
}
