import { Throttle } from '@nestjs/throttler';

export type StrictThrottleOptions = {
  /** Required — strict limits are never taken from module options. */
  limit: number;
  ttlMs?: number;
};

/**
 * Applies an additional strict rate limit on the route. `limit` must be supplied explicitly.
 * Limits are not read from AuthModuleOptions — only decorator arguments apply.
 */
export const StrictThrottle = (options: StrictThrottleOptions) => {
  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    throw new Error('StrictThrottle requires a positive limit');
  }

  return Throttle({
    strict: {
      limit: options.limit,
      ttl: options.ttlMs ?? 60_000,
    },
  });
};
