import { z } from 'zod';

/**
 * Structured content that fills a base `.hbs` layout (e.g. `email.hbs`).
 * Field names mirror the Handlebars placeholders in the base template
 * (`body.header.*`, `body.content.*`, `body.footer.*`). Values may contain
 * `{{placeholders}}` that are resolved against the caller data at dispatch time.
 */
export const EmailLayoutDataSchema = z.object({
  body: z.object({
    header: z.object({
      heading: z.string().min(1),
      subHeading: z.string().optional(),
    }),
    content: z
      .object({
        salutation: z.string().optional(),
        paragraph1_blue: z.string().optional(),
        details: z
          .array(
            z.object({
              heading: z.string(),
              fields: z.array(
                z.object({
                  name: z.string(),
                  value: z.string(),
                }),
              ),
            }),
          )
          .optional(),
        paragraph2_blue: z.string().optional(),
        button1: z
          .object({
            href: z.string(),
            buttonName: z.string(),
          })
          .optional(),
        table: z
          .array(
            z.object({
              heading: z.string(),
              colWidth: z.union([z.string(), z.number()]),
              data: z.array(z.array(z.string())),
            }),
          )
          .optional(),
        paragraph3_blue: z.string().optional(),
        paragraph4_orange: z.string().optional(),
        signature: z.string().optional(),
        disclaimer: z.string().optional(),
      })
      .default({}),
    footer: z
      .object({
        footerPanel: z
          .object({
            heading: z.string(),
            details: z.array(z.string()),
          })
          .optional(),
        footer: z.string().optional(),
      })
      .optional(),
  }),
});

/** Payload shape for correspondence email templates stored in json-store. */
export const EmailTemplatePayloadSchema = z
  .object({
    subject: z.string().min(1),
    /** Raw Handlebars HTML body. When set, it is compiled directly. */
    htmlTemplate: z.string().min(1).optional(),
    /** Structured content rendered into the `layout` base template. */
    htmlTemplateData: EmailLayoutDataSchema.optional(),
    /** Base `.hbs` layout name used to render `htmlTemplateData` (default `email`). */
    layout: z.string().min(1).optional(),
    textTemplate: z.string().optional(),
    defaultData: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((d) => !!d.htmlTemplate || !!d.htmlTemplateData, {
    message: 'Provide either htmlTemplate or htmlTemplateData',
    path: ['htmlTemplate'],
  });

export type EmailTemplatePayload = z.infer<typeof EmailTemplatePayloadSchema>;
