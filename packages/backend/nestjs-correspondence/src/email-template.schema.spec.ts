import { EmailTemplatePayloadSchema } from './email-template.schema';


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
});
