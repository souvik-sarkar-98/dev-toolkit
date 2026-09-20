import { z } from 'zod';

export const AuthOptionsSchema = z.object({
  jwt: z.object({
    jwksUri: z.string().url(),
    issuer: z.string().min(1),
    audience: z.string().min(1),
  }),
  recaptcha: z
    .object({
      secretKey: z.string().min(1),
      minScore: z.coerce.number().min(0).max(1).optional(),
    })
    .optional(),
  apiKey: z
    .object({
      headerName: z.string().min(1).optional(),
    })
    .optional(),
  cache: z
    .object({
      userAccessTtlMs: z.coerce.number().positive().optional(),
      apiKeyTtlMs: z.coerce.number().positive().optional(),
    })
    .optional(),
  throttler: z
    .object({
      /** When false, rate limiting is disabled for the entire application. */
      enabled: z.boolean().optional(),
      /** Request path prefixes that should never be rate-limited (e.g. `/health`). */
      skipPathPrefixes: z.array(z.string()).optional(),
      /** Redis URL for distributed rate-limit counters across replicas. */
      storageRedisUrl: z.string().url().optional(),
      /**
       * Module-level profile limits (requests per ttlMs window).
       * `strict` is decorator-only and is not configurable here.
       */
      profiles: z
        .object({
          default: z
            .object({
              limit: z.coerce.number().positive().optional(),
              ttlMs: z.coerce.number().positive().optional(),
            })
            .optional(),
          open: z
            .object({
              limit: z.coerce.number().positive().optional(),
              ttlMs: z.coerce.number().positive().optional(),
            })
            .optional(),
          protected: z
            .object({
              limit: z.coerce.number().positive().optional(),
              ttlMs: z.coerce.number().positive().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export type AuthModuleOptions = z.infer<typeof AuthOptionsSchema>;
