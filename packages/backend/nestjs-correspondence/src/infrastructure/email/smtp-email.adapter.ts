import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { IEmailSenderPort, EmailMessage } from '../../domain/ports/email-sender.port';
import { CORRESPONDENCE_OPTIONS } from '../../correspondence-options.token';
import type { CorrespondenceModuleOptions } from '../../correspondence.module';
import { EmailDeliveryFailedError } from '../../domain/errors/correspondence.errors';

@Injectable()
export class SmtpEmailAdapter implements IEmailSenderPort {
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @Inject(CORRESPONDENCE_OPTIONS)
    private readonly options: CorrespondenceModuleOptions,
  ) {}

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const smtp = this.options.email?.smtp;
      if (!smtp?.host) {
        throw new EmailDeliveryFailedError('SMTP is not configured (host is missing).');
      }
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port ?? 587,
        secure: smtp.secure ?? false,
        auth: smtp.user
          ? { user: smtp.user, pass: smtp.password }
          : undefined,
      });
    }
    return this.transporter;
  }

  async send(message: EmailMessage): Promise<void> {
    const fromName = this.options.email?.fromName ?? this.options.appName ?? '';
    const fromAddress = this.options.email?.fromAddress ?? this.options.email?.smtp?.user ?? 'noreply@example.com';

    const info = await this.getTransporter().sendMail({
      from: message.from ?? `"${fromName}" <${fromAddress}>`,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
        contentType: a.contentType,
        cid: a.cid,
      })),
    });

    this.logger.log(`SMTP sent messageId=${info.messageId} to=${message.to.join(', ')}`);
  }
}
