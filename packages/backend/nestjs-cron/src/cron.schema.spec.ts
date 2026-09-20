/**
 * Cron2OptionsSchema (Zod) unit tests.
 * Validates that module options are correctly accepted or rejected.
 * Supersedes: test/cron/cron.schema.spec.ts (timezone/defaults coverage for cron)
 */
import { Cron2OptionsSchema } from '@ssdev-toolkit/nestjs-cron/cron.schema';

describe('Cron2OptionsSchema', () => {
  describe('valid inputs', () => {
    it('accepts an empty object (all fields are optional)', () => {
      const result = Cron2OptionsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('defaults timezone to "UTC" when not provided', () => {
      const result = Cron2OptionsSchema.parse({});
      expect(result.timezone).toBe('UTC');
    });

    it('accepts a custom IANA timezone string', () => {
      const result = Cron2OptionsSchema.safeParse({ timezone: 'Asia/Kolkata' });
      expect(result.success).toBe(true);
    });

    it('preserves the provided timezone value', () => {
      const result = Cron2OptionsSchema.parse({ timezone: 'America/New_York' });
      expect(result.timezone).toBe('America/New_York');
    });

    it('accepts undefined timezone (falls back to default)', () => {
      const result = Cron2OptionsSchema.safeParse({ timezone: undefined });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects a non-string timezone', () => {
      const result = Cron2OptionsSchema.safeParse({ timezone: 42 });
      expect(result.success).toBe(false);
    });

    it('rejects a boolean timezone', () => {
      const result = Cron2OptionsSchema.safeParse({ timezone: true });
      expect(result.success).toBe(false);
    });
  });

  describe('type inference', () => {
    it('the inferred Cron2ModuleOptions type has a timezone field', () => {
      const opts = Cron2OptionsSchema.parse({ timezone: 'UTC' });
      // Compile-time check that the type is correct
      const tz: string = opts.timezone;
      expect(typeof tz).toBe('string');
    });
  });
});
