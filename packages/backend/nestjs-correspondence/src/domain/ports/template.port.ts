export interface EmailLayoutField {
  name: string;
  value: string;
}

export interface EmailLayoutDetail {
  heading: string;
  fields: EmailLayoutField[];
}

export interface EmailLayoutTable {
  heading: string;
  colWidth: string | number;
  data: string[][];
}

export interface EmailLayoutButton {
  href: string;
  buttonName: string;
}

export interface EmailLayoutFooterPanel {
  heading: string;
  details: string[];
}

/**
 * Structured content that fills a base `.hbs` layout (e.g. `email.hbs`).
 * Field names mirror the layout's Handlebars placeholders.
 */
export interface EmailLayoutData {
  body: {
    header: {
      heading: string;
      subHeading?: string;
    };
    content: {
      salutation?: string;
      paragraph1_blue?: string;
      details?: EmailLayoutDetail[];
      paragraph2_blue?: string;
      button1?: EmailLayoutButton;
      table?: EmailLayoutTable[];
      paragraph3_blue?: string;
      paragraph4_orange?: string;
      signature?: string;
      disclaimer?: string;
    };
    footer?: {
      footerPanel?: EmailLayoutFooterPanel;
      footer?: string;
    };
  };
}

export interface EmailTemplateData {
  subject: string;
  /** Raw Handlebars template string for the HTML body. Compiled directly when present. */
  htmlTemplate?: string;
  /** Structured content rendered into the `layout` base template. */
  htmlTemplateData?: EmailLayoutData;
  /** Base `.hbs` layout name used to render `htmlTemplateData` (default `email`). */
  layout?: string;
  textTemplate?: string;
  defaultData?: Record<string, any>;
}

export interface ITemplatePort {
  findByKey(key: string): Promise<EmailTemplateData | null>;
}

export const ITemplatePort = Symbol('ITemplatePort');
