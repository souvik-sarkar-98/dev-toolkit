import { z } from 'zod';

export const Cron2OptionsSchema = z.object({
  /**
   * IANA timezone used to evaluate cron schedules and compute next-run times
   * (e.g. "Asia/Kolkata", "America/New_York"). Defaults to `"UTC"`.
   */
  timezone: z.string().optional().default('UTC'),
});

export type Cron2ModuleOptions = z.input<typeof Cron2OptionsSchema>;
