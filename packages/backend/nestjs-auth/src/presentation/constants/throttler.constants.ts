/** Mirrors @nestjs/throttler internal metadata keys — not exported from the package. */
export const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
export const THROTTLER_TTL = 'THROTTLER:TTL';
export const THROTTLER_TRACKER = 'THROTTLER:TRACKER';
export const THROTTLER_SKIP = 'THROTTLER:SKIP';
export const THROTTLER_BLOCK_DURATION = 'THROTTLER:BLOCK_DURATION';
export const THROTTLER_KEY_GENERATOR = 'THROTTLER:KEY_GENERATOR';

export {
  MODULE_THROTTLE_PROFILES,
  THROTTLE_PROFILE_DEFAULTS,
  type ThrottleProfileName,
} from '../utilities/resolve-throttlers.util';
