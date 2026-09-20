import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { EmailTemplatePayloadSchema } from './email-template.schema';

const correspondenceSeedDir = join(
  __dirname,
  '../../../../apps/api/src/shared/seeds/json-store/data/correspondence',
);

describe('EmailTemplatePayloadSchema', () => {
  it('accepts valid template payloads', () => {
    const result = EmailTemplatePayloadSchema.safeParse({
      subject: 'Welcome',
      htmlTemplate: '<p>Hi</p>',
      textTemplate: 'Hi',
    });

    expect(result.success).toBe(true);
  });

  it('accepts payloads with structured htmlTemplateData and a layout', () => {
    const result = EmailTemplatePayloadSchema.safeParse({
      subject: 'Welcome',
      layout: 'email',
      htmlTemplateData: {
        body: {
          header: { heading: 'Welcome!' },
          content: { paragraph1_blue: 'Hi {{name}}' },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects payloads missing both htmlTemplate and htmlTemplateData', () => {
    const result = EmailTemplatePayloadSchema.safeParse({
      subject: 'Welcome',
    });

    expect(result.success).toBe(false);
  });

  it('validates all correspondence seed files', () => {
    const files = readdirSync(correspondenceSeedDir).filter(
      (f) => f.endsWith('.json') && !f.startsWith('_'),
    );

    for (const file of files) {
      const payload = JSON.parse(readFileSync(join(correspondenceSeedDir, file), 'utf-8'));
      const result = EmailTemplatePayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    }
  });
});
