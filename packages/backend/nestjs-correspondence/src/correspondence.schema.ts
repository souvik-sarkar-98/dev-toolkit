import { z } from 'zod';
import { EmailThemeSchema } from './email-theme';

/**
 * Host-registered resource type that users may follow (resource subscription).
 * Requests for unlisted types are rejected when the allowlist is non-empty.
 */
export interface ResourceTypeConfig {
  resourceType: string;
  /**
   * Optional: user needs at least one of these to subscribe to this type.
   * When omitted, only the global `create:subscriptions` permission applies.
   */
  subscribePermissions?: string[];
}

export const CorrespondenceOptionsSchema = z.object({
  appName: z.string().optional(),
  environment: z.string(),
  /**
   * Resource types that may be followed via correspondence subscriptions.
   * Omit or pass `[]` to allow any resource type (open mode).
   */
  allowedResourceTypes: z.array(z.custom<ResourceTypeConfig>()).optional(),
  email: z
    .object({
      fromName: z.string().optional(),
      fromAddress: z.string().email().optional(),
      enableProdMode: z.coerce.boolean().default(false),
      enableMocking: z.coerce.boolean().default(false),
      mockedAddress: z.string().email().optional(),
      /**
       * Branding of the base email layout. Unset tokens fall back to
       * {@link DEFAULT_EMAIL_THEME}.
       */
      theme: EmailThemeSchema.optional(),
      smtp: z
        .object({
          host: z.string(),
          port: z.coerce.number().default(587),
          secure: z.coerce.boolean().default(false),
          user: z.string().optional(),
          password: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  push: z
    .object({
      oneSignal: z
        .object({
          appId: z.string(),
          apiKey: z.string(),
        })
        .optional(),
    })
    .optional(),
  retention: z
    .object({
      /** Days after which old notifications are deleted. Default 90 */
      notificationRetentionDays: z.coerce.number().default(90),
      /** Days after which inactive subscriptions are purged. Default 180 */
      inactiveSubscriptionRetentionDays: z.coerce.number().default(180),
    })
    .optional(),
});

export type CorrespondenceModuleOptions = z.infer<typeof CorrespondenceOptionsSchema>;
