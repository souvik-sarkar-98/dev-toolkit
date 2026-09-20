export interface EmailAttachment {
  filename: string;
  /** Base64-encoded attachment bytes. */
  content: string;
  contentType?: string;
  /** Optional content-id for referencing the attachment inline in the HTML body. */
  cid?: string;
}

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface IEmailSenderPort {
  send(message: EmailMessage): Promise<void>;
}

export const IEmailSenderPort = Symbol('IEmailSenderPort');
