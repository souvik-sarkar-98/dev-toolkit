import { z } from 'zod';

/** Payload shape for cron jobs stored in json-store. */
export const CronJobPayloadSchema = z.object({
  name: z.string().min(1),
  expression: z.string().min(1),
  description: z.string(),
  handler: z.string().min(1),
  enabled: z.boolean(),
  inputData: z.record(z.string(), z.unknown()).optional(),
});

export type CronJobPayload = z.infer<typeof CronJobPayloadSchema>;
