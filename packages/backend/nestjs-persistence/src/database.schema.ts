import { z } from "zod";

export const DatabaseOptionsSchema = z.object({
  redisUrl: z.string().url("redisUrl must be a valid URL"),
  prismaClientFactory: z.function({
    input: [],
    output: z.any(),
  }),
  auditedModels: z.array(z.string()).optional().default([]),
  enableAuditExtension: z.coerce.boolean().optional().default(false),
  auditCaptureOldValuesModels: z.array(z.string()).optional().default([]),
  failOnAuditError: z.coerce.boolean().optional().default(false),
  cacheStoreTtl: z.coerce.number().positive().optional(),
});
