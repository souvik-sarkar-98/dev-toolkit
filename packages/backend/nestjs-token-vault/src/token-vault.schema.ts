import { z } from 'zod';

export const TokenVaultOptionsSchema = z
  .object({
    /**
     * Google OAuth vault. Stores Gmail / Drive / Calendar service credentials.
     * Requires encryption.secret.
     */
    googleOAuth: z
      .object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        callbackUrl: z.string().url(),
        allowedScopes: z.array(z.string()).optional(),
      })
      .optional(),
    /**
     * Microsoft OAuth vault. Stores Microsoft Graph / OneDrive credentials.
     * tenantId may be a GUID, "common", "organizations", or "consumers".
     * Requires encryption.secret.
     */
    microsoftOAuth: z
      .object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        tenantId: z.string().min(1),
        callbackUrl: z.string().url(),
        allowedScopes: z.array(z.string()).optional(),
      })
      .optional(),
    /**
     * Mandatory when any OAuth provider is configured.
     * Used to AES-256-GCM encrypt stored access/refresh tokens at rest.
     * Must be at least 32 characters.
     */
    encryption: z
      .object({
        secret: z
          .string()
          .min(32, 'encryption.secret must be at least 32 characters'),
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    const needsEncryption = !!val.googleOAuth || !!val.microsoftOAuth;
    if (needsEncryption && !val.encryption?.secret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['encryption', 'secret'],
        message:
          'encryption.secret is required when any OAuth provider is configured (used to encrypt stored tokens at rest)',
      });
    }
  });
