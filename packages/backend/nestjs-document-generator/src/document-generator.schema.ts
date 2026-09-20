import { z } from 'zod';

export const DocumentGeneratorOptionsSchema = z.object({
  watermarkPath: z.string().optional(),
  templatesDir: z.string().optional(),
});

export type DocumentGeneratorModuleOptions = z.infer<typeof DocumentGeneratorOptionsSchema>;
