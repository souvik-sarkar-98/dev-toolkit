/** What an indicator reports back about the dependency it probes. */
export interface HealthIndicatorOutcome {
  healthy: boolean;
  /** Human-readable reason, surfaced only when `exposeCheckDetails` is enabled. */
  message?: string;
  /** Arbitrary diagnostic data, surfaced only when `exposeCheckDetails` is enabled. */
  details?: Record<string, unknown>;
}

/**
 * Contract for a single readiness probe (a database, a cache, a downstream API).
 *
 * Implementations are resolved through Nest DI, so they may inject anything the
 * host application provides. Throwing from `check()` is equivalent to returning
 * `{ healthy: false }` — the runner catches it and records the message.
 */
export interface IHealthIndicator {
  /** Unique key for this probe in the readiness `checks` map. */
  readonly name: string;
  /**
   * When false, a failure degrades the report but keeps the service ready.
   * Defaults to true when omitted.
   */
  readonly critical?: boolean;
  check(): Promise<HealthIndicatorOutcome> | HealthIndicatorOutcome;
}

/**
 * Functional form of {@link IHealthIndicator}, for probes that need no DI.
 * Returning a bare boolean is shorthand for `{ healthy: <boolean> }`.
 */
export interface HealthCheckDefinition {
  name: string;
  critical?: boolean;
  check(): Promise<HealthIndicatorOutcome | boolean> | HealthIndicatorOutcome | boolean;
}

/** Resolves to `readonly IHealthIndicator[]` — every probe registered with the module. */
export const HEALTH_INDICATORS = Symbol('HEALTH_INDICATORS');
