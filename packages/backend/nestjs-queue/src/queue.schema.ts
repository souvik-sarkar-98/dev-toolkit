import { z } from "zod";

export const QUEUE_OPTIONS = Symbol("QUEUE_OPTIONS");

export const QueueOptionsSchema = z.object({
  connection: z
    .object({
      url: z.string().optional(),
      host: z.string().optional(),
      port: z.coerce.number().positive().optional(),
      password: z.string().optional(),
      db: z.coerce.number().optional(),
    })
    .refine((c) => c.url || c.host, {
      message: "Provide either connection.url or connection.host",
    }),
  defaultJobOptions: z
    .object({
      removeOnComplete: z
        .union([
          z.coerce.number(),
          z.object({
            age: z.coerce.number().optional(),
            count: z.coerce.number().optional(),
          }),
        ])
        .optional(),
      removeOnFail: z
        .union([
          z.coerce.number(),
          z.object({
            age: z.coerce.number().optional(),
            count: z.coerce.number().optional(),
          }),
        ])
        .optional(),
      attempts: z.coerce.number().positive().optional(),
      backoff: z
        .object({ type: z.enum(["fixed", "exponential"]), delay: z.coerce.number() })
        .optional(),
    })
    .optional(),
  // Only the built-in "default" queue is processed by QueueProcessorRegistry.
  // Multi-queue routing is not supported; this field has been removed to avoid
  // misleading configuration. Register only a single "default" queue.
  concurrency: z.coerce.number().positive().optional().default(1),
});

export type QueueModuleOptions = z.infer<typeof QueueOptionsSchema>;
export type QueueModuleInputOptions = z.input<typeof QueueOptionsSchema>;
