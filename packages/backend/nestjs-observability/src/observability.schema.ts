import { z } from "zod";

/** Injection token for the observability configuration object. */
export const OBSERVABILITY_OPTIONS = Symbol('OBSERVABILITY_OPTIONS');

export const ObservabilityOptionsSchema = z.object({
  /**
   * Master switch. Set to false to disable all alert delivery without removing
   * the module registration. Defaults to true.
   */
  enabled: z.coerce.boolean().optional().default(true),
  slack: z
    .object({
      webhookUrl: z.string().url("slack.webhookUrl must be a valid URL"),
      channel: z.string().optional(),
    })
    .optional(),
  /**
   * Environments in which alerts are sent. Values are normalised
   * ("production" → "prod") before comparison, so the standard Node
   * NODE_ENV=production matches the default ["prod"].
   */
  alertOnEnvironments: z.array(z.string()).optional().default(["prod"]),
  /** Current environment name (e.g. "prod", "staging"). Shown in Slack alerts. */
  environment: z.string().optional(),
  /**
   * Include the full stack trace in the Slack message. Default false — stack
   * traces can contain SQL, tokens, and PII; the trace id is always included so
   * full detail can be found in server logs.
   */
  includeStackTrace: z.coerce.boolean().optional().default(false),
  /** Prefix alerts with <!channel> to ping everyone. Default false. */
  mentionChannel: z.coerce.boolean().optional().default(false),
  /** HTTP timeout (ms) for the Slack webhook call. Default 5000. */
  httpTimeoutMs: z.coerce.number().int().positive().optional().default(5000),
  /**
   * Minimum interval (ms) between alerts that share the same fingerprint.
   * Prevents alert storms from a burst of identical errors. Default 60000.
   */
  dedupeIntervalMs: z.coerce.number().int().nonnegative().optional().default(60_000),
});

export type ObservabilityModuleOptions = z.infer<typeof ObservabilityOptionsSchema>;
export type ObservabilityModuleInput = z.input<typeof ObservabilityOptionsSchema>;

/** Normalises common environment aliases to a canonical short form. */
export function normalizeEnvironment(env: string | undefined): string {
  const value = (env ?? "unknown").toLowerCase().trim();
  if (value === "production") return "prod";
  if (value === "development") return "dev";
  if (value === "stage") return "staging";
  return value;
}
