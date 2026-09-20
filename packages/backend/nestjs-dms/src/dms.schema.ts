import { z } from 'zod';

export interface EntityTypeConfig {
  entityType: string;
  /** User needs AT LEAST ONE of these to read documents on this entity type. */
  readPermissions?: string[];
  /** User needs AT LEAST ONE of these to write/delete documents on this entity type. */
  writePermissions?: string[];
  /** Maximum number of documents allowed per entity instance. */
  maxDocumentsPerEntity?: number;
}

export const Dms2OptionsSchema = z.object({
  maxFileSizeMb: z.coerce.number().positive().default(50),
  allowedMimeTypes: z.array(z.string()).default(['image/*', 'application/pdf']),
  allowedEntityTypes: z.array(z.custom<EntityTypeConfig>()).optional(),
  provider: z.enum(['firebase', 'google-drive']).default('firebase'),
  /**
   * Required when `provider` is `"firebase"`. Holds the Firebase project
   * credentials used to initialise the firebase-admin SDK internally.
   */
  firebase: z
    .object({
      serviceAccount: z.union([
        z.string().min(1, 'serviceAccount must be a non-empty JSON string or object'),
        z.record(z.string(), z.any()),
      ]),
      storageBucket: z.string().optional(),
      projectId: z.string().optional(),
    })
    .optional(),
  googleDrive: z
    .object({
      folderId: z.string().optional(),
    })
    .optional(),
});

export type DmsModuleOptions = z.infer<typeof Dms2OptionsSchema>;
