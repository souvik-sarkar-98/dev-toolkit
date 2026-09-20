import { z } from 'zod';

export interface EntityTypeConfig {
  entityType: string;
  /** Human-readable display name for logs/errors. */
  displayName?: string;
  /** User needs AT LEAST ONE of these to read form submissions on this entity type. */
  readPermissions?: string[];
  /** User needs AT LEAST ONE of these to write/submit form data on this entity type. */
  writePermissions?: string[];
}

/** Default TTL for cached form definitions: 30 days in milliseconds. */
export const DEFAULT_CUSTOM_FORMS_CACHE_TTL_MS = 2_592_000_000;

/**
 * Json Store namespace for static select/multiselect options.
 * Document key = form field definition id; payload shape validated in the host app.
 */

export const CustomFormsOptionsSchema = z.object({
  allowedEntityTypes: z
    .array(z.custom<EntityTypeConfig>())
    .optional(),
  encryptionKey: z
    .string()
    .min(32, 'encryptionKey must be at least 32 characters for AES-256')
    .optional(),
  /**
   * Time-to-live in milliseconds for cached Form entries.
   * Write operations evict relevant cache entries immediately.
   * Default: 2_592_000_000 (30 days).
   */
  cacheTtlMs: z
    .number()
    .int()
    .positive()
    .optional(),
});

export type CustomFormsModuleOptions = z.infer<typeof CustomFormsOptionsSchema>;
