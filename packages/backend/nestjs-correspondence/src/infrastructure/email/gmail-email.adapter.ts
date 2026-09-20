import { gmail as googleMail } from '@googleapis/gmail';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IOAuthAccessTokenPort,
  OAUTH_ACCESS_TOKEN_PORT,
} from '@ssdev-toolkit/nestjs-core';
import { OAuth2Client } from 'googleapis-common';
import { IEmailSenderPort, EmailMessage, EmailAttachment } from '../../domain/ports/email-sender.port';
import { CORRESPONDENCE_OPTIONS } from '../../correspondence-options.token';
import type { CorrespondenceModuleOptions } from '../../correspondence.module';

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

@Injectable()
export class GmailEmailAdapter implements IEmailSenderPort {
  private readonly logger = new Logger(GmailEmailAdapter.name);

  constructor(
    @Inject(OAUTH_ACCESS_TOKEN_PORT)
    private readonly oauthTokens: IOAuthAccessTokenPort,
    @Inject(CORRESPONDENCE_OPTIONS)
    private readonly options: CorrespondenceModuleOptions,
  ) { }

  async send(message: EmailMessage): Promise<void> {
    const accessToken = await this.oauthTokens.getAccessToken({
      provider: 'google',
      scope: GMAIL_SEND_SCOPE,
    });

    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: accessToken });

    const fromEmail = this.options.email?.fromAddress ?? 'noreply@example.com';
    const fromName = this.options.email?.fromName ?? this.options.appName ?? '';
    const fromHeader = message.from ?? `"${fromName}" <${fromEmail}>`;

    const gmail = googleMail({ version: 'v1', auth: authClient });
    const raw = this.buildRawMessage(message, fromHeader);

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    this.logger.log(
      `Gmail sent messageId=${response.data.id} to=${message.to.join(', ')}`,
    );
  }

  private buildRawMessage(message: EmailMessage, fromHeader: string): string {
    const headers: string[] = [];
    headers.push(`From: ${fromHeader}`);
    headers.push(`To: ${message.to.join(', ')}`);
    if (message.cc?.length) headers.push(`Cc: ${message.cc.join(', ')}`);
    if (message.bcc?.length) headers.push(`Bcc: ${message.bcc.join(', ')}`);
    headers.push(`Subject: ${message.subject}`);
    headers.push(`Date: ${new Date().toUTCString()}`);
    headers.push('MIME-Version: 1.0');

    const bodyPart = this.buildBodyPart(message);

    let lines: string[];
    if (message.attachments?.length) {
      const mixedBoundary = `mixed_${Date.now()}`;
      lines = [
        ...headers,
        `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
        '',
        `--${mixedBoundary}`,
        ...bodyPart,
        ...message.attachments.flatMap((a) =>
          this.buildAttachmentPart(a, mixedBoundary),
        ),
        `--${mixedBoundary}--`,
      ];
    } else {
      lines = [...headers, ...bodyPart];
    }

    return Buffer.from(lines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Builds the message body part (Content-Type header + body). When embedded in a
   * multipart/mixed message the caller precedes this with a boundary delimiter.
   */
  private buildBodyPart(message: EmailMessage): string[] {
    if (message.text) {
      const altBoundary = `alt_${Date.now()}`;
      return [
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        '',
        `--${altBoundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        message.text,
        `--${altBoundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        message.html,
        `--${altBoundary}--`,
      ];
    }
    return ['Content-Type: text/html; charset=utf-8', '', message.html];
  }

  private buildAttachmentPart(
    attachment: EmailAttachment,
    boundary: string,
  ): string[] {
    const contentType = attachment.contentType ?? 'application/octet-stream';
    const disposition = attachment.cid ? 'inline' : 'attachment';
    const lines = [
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: ${disposition}; filename="${attachment.filename}"`,
    ];
    if (attachment.cid) {
      lines.push(`Content-ID: <${attachment.cid}>`);
    }
    lines.push('');
    lines.push(...this.chunkBase64(attachment.content));
    return lines;
  }

  /** Splits a base64 string into 76-char lines per RFC 2045. */
  private chunkBase64(content: string): string[] {
    const normalized = content.replace(/[\r\n]/g, '');
    return normalized.match(/.{1,76}/g) ?? [normalized];
  }
}
