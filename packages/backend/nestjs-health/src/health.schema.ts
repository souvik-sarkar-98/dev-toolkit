import { z } from 'zod';

/** Injection token for the validated health configuration object. */
export const HEALTH_OPTIONS = Symbol('HEALTH_OPTIONS');

/**
 * Runtime configuration. Everything here can be resolved asynchronously through
 * `forRootAsync`, unlike the wiring options in `health.module.ts`, which must be
 * known when the controller class is built.
 */
export const HealthOptionsSchema = z.object({
  /** Reported as `service` on every probe payload. Omitted when unset. */
  serviceName: z.string().min(1).optional(),
  /** Reported as `version` on every probe payload. Omitted when unset. */
  version: z.string().min(1).optional(),
  /**
   * Budget for a single indicator. Exceeding it marks that check down rather
   * than hanging the probe — an unresponsive dependency is a failed dependency.
   */
  checkTimeoutMs: z.coerce.number().int().positive().optional().default(3000),
  /**
   * Include per-check durations and failure messages in the readiness payload.
   * Default false — failure messages can carry connection strings and hostnames,
   * and `/ready` is usually unauthenticated.
   */
  exposeCheckDetails: z.coerce.boolean().optional().default(false),
  /** Tuning for the built-in database indicator. Ignored when `databaseIndicator: false`. */
  database: z
    .object({
      name: z.string().min(1).optional().default('database'),
      critical: z.coerce.boolean().optional().default(true),
    })
    .optional()
    .default({ name: 'database', critical: true }),
  /** Tuning for the built-in cache indicator. Ignored when `cacheIndicator: false`. */
  cache: z
    .object({
      name: z.string().min(1).optional().default('redis'),
      critical: z.coerce.boolean().optional().default(true),
      /** Key written and immediately deleted to prove a full round-trip. */
      probeKey: z.string().min(1).optional().default('__health_probe__'),
      probeTtlMs: z.coerce.number().int().positive().optional().default(5000),
      /**
       * Fail the check when Redis `used_memory` exceeds this many bytes. Costs
       * one extra `INFO memory` command per probe, so it is off by default.
       */
      memoryThresholdBytes: z.coerce.number().int().positive().optional(),
    })
    .optional()
    .default({
      name: 'redis',
      critical: true,
      probeKey: '__health_probe__',
      probeTtlMs: 5000,
    }),
});

export type HealthModuleOptions = z.infer<typeof HealthOptionsSchema>;
export type HealthModuleInput = z.input<typeof HealthOptionsSchema>;
