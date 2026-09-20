export interface CronJob {
  name: string;
  /** 5-part UNIX cron expression, e.g. "0 8 * * *" */
  expression: string;
  description: string;
  /** BullMQ job name — must match the consumer's job class constructor name */
  handler: string;
  enabled: boolean;
  inputData?: Record<string, any>;
}
