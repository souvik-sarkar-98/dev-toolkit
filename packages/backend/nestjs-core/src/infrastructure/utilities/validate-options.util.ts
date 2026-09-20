import { z } from 'zod';

/**
 * Validates module options against a Zod schema at bootstrap time.
 * Throws a clear error immediately if misconfigured — before any service initialises.
 *
 * @param moduleName - Display name for error messages (e.g. "DatabaseModule")
 * @param schema     - Zod schema to validate against
 * @param options    - Raw options object to validate
 * @returns Validated and defaults-applied options
 */
export function validateModuleOptions<T extends z.ZodTypeAny>(
  moduleName: string,
  schema: T,
  options: unknown,
): z.infer<T> {
  const result = schema.safeParse(options);
  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`[${moduleName}] Config validation failed:\n${errors}`);
  }
  return result.data;
}
