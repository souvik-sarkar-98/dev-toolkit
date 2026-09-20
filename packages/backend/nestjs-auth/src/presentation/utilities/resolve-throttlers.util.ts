import { AuthModuleOptions } from '../../auth-options';

export type ThrottleProfileName = 'default' | 'open' | 'protected' | 'strict';

/** Profiles registered on ThrottlerModule — `strict` uses decorator-supplied limits only. */
export const MODULE_THROTTLE_PROFILES: ThrottleProfileName[] = [
  'default',
  'open',
  'protected',
  'strict',
];

export const THROTTLE_PROFILE_DEFAULTS: Record<
  Exclude<ThrottleProfileName, 'strict'>,
  { limit: number; ttlMs: number }
> & { strict: { limit: number; ttlMs: number } } = {
  default: { limit: 600, ttlMs: 60_000 },
  open: { limit: 10, ttlMs: 60_000 },
  protected: { limit: 300, ttlMs: 60_000 },
  strict: { limit: 1, ttlMs: 60_000 },
};

const MODULE_PROFILE_OVERRIDABLE: Array<Exclude<ThrottleProfileName, 'strict'>> = [
  'default',
  'open',
  'protected',
];

export function resolveThrottlers(
  config?: AuthModuleOptions['throttler'],
): Array<{ name: ThrottleProfileName; ttl: number; limit: number }> {
  const overrides = config?.profiles ?? {};

  const moduleProfiles = MODULE_PROFILE_OVERRIDABLE.map((name) => {
    const defaults = THROTTLE_PROFILE_DEFAULTS[name];
    const override = overrides[name];
    return {
      name,
      limit: override?.limit ?? defaults.limit,
      ttl: override?.ttlMs ?? defaults.ttlMs,
    };
  });

  const strictDefaults = THROTTLE_PROFILE_DEFAULTS.strict;
  return [
    ...moduleProfiles,
    { name: 'strict', limit: strictDefaults.limit, ttl: strictDefaults.ttlMs },
  ];
}
