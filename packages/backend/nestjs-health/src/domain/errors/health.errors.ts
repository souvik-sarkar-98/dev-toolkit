import { BusinessError } from '@ssdev-toolkit/nestjs-core';

/**
 * Raised when a health indicator exceeds its allotted budget. The runner
 * converts this into a `DOWN` check result — it never reaches the HTTP edge.
 */
export class HealthIndicatorTimeoutError extends BusinessError {
  constructor(indicatorName: string, timeoutMs: number) {
    super(
      `Health indicator "${indicatorName}" did not respond within ${timeoutMs}ms.`,
      'HEALTH_INDICATOR_TIMEOUT',
      503,
    );
  }
}

/**
 * Raised at bootstrap when two indicators claim the same name. Names key the
 * `checks` map in the readiness payload, so duplicates would silently hide a
 * probe from operators.
 */
export class DuplicateHealthIndicatorError extends BusinessError {
  constructor(indicatorName: string) {
    super(
      `More than one health indicator is registered under the name "${indicatorName}".`,
      'DUPLICATE_HEALTH_INDICATOR',
      500,
    );
  }
}

/** Raised when an indicator is registered without a usable name. */
export class InvalidHealthIndicatorError extends BusinessError {
  constructor(reason: string) {
    super(`Invalid health indicator: ${reason}`, 'INVALID_HEALTH_INDICATOR', 500);
  }
}
