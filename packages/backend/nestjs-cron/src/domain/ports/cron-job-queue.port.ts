export const CRON_JOB_QUEUE_PORT = Symbol('ICronJobQueuePort');

export interface ICronJobQueuePort {
  /**
   * @param cronName    User-defined cron job name (e.g. "daily-cleanup") — used as
   *                    the deterministic BullMQ jobId seed to prevent duplicate
   *                    enqueues within the 60-minute look-back window.
   * @param handlerName BullMQ job name (= consumer's job class constructor name) —
   *                    used to route the job to the correct processor.
   * @param payload     Data forwarded to the consumer's handler.
   * @param scheduledAt Scheduled occurrence timestamp; included in the jobId when
   *                    provided so each cron fire has a unique, stable identifier.
   */
  enqueue(
    cronName: string,
    handlerName: string,
    payload?: Record<string, any>,
    scheduledAt?: Date,
  ): Promise<{ id: string }>;
}
