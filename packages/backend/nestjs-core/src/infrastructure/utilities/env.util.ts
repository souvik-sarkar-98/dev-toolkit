const PROD_ENVIRONMENTS = ['prod', 'production'] as const;
const HIGHER_ENVIRONMENTS = ['qa', 'test', 'stage', 'staging', 'uat', 'preview', 'prod', 'production'] as const;

/** Returns the current environment name, lower-cased. Falls back to `fallback` (default `'development'`). */
export function getEnv(fallback = 'development'): string {
  return (process.env.NODE_ENV ?? fallback).toLowerCase();
}

/**
 * Returns `true` when `environment` is a production environment
 * (`'prod'` or `'production'`). Comparison is case-insensitive.
 *
 * Use this to gate features that must be disabled in production
 * (e.g. Swagger, verbose error messages, permissive CORS).
 */
export function isProd(environment?: string): boolean {
  const env = (environment ?? process.env.NODE_ENV ?? '').toLowerCase();
  return (PROD_ENVIRONMENTS as readonly string[]).includes(env);
}

/**
 * Returns `true` when `environment` is NOT a production environment.
 * Inverse of `isProd` — includes local, staging, UAT, QA, etc.
 */
export function isNonProd(environment?: string): boolean {
  return !isProd(environment);
}

/**
 * Returns `true` when `environment` is a higher / shared environment:
 * `'qa'`, `'test'`, `'stage'`, `'staging'`, `'uat'`, `'preview'`, `'prod'`, or `'production'`.
 *
 * These environments are reachable by real users or external systems — treat
 * them as sensitive regardless of whether they are strictly "production".
 * Use this to mask error details, restrict tooling access, etc.
 */
export function isHigherEnv(environment?: string): boolean {
  const env = (environment ?? process.env.NODE_ENV ?? '').toLowerCase();
  return (HIGHER_ENVIRONMENTS as readonly string[]).includes(env);
}

/**
 * Returns `true` when `environment` is a local / developer environment
 * (`'dev'`, `'development'`, or `'local'`). Inverse of `isHigherEnv`.
 *
 * Use this where internal details (stack traces, raw error messages) are safe
 * to expose — i.e. environments never reachable by end users.
 */
export function isLocalEnv(environment?: string): boolean {
  return !isHigherEnv(environment);
}
