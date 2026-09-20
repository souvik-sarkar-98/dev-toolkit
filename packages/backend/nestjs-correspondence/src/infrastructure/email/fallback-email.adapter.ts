import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IOAuthAccessTokenPort,
  OAUTH_ACCESS_TOKEN_PORT,
} from '@ssdev-toolkit/nestjs-core';
import { IEmailSenderPort, EmailMessage } from '../../domain/ports/email-sender.port';
import { GmailEmailAdapter } from './gmail-email.adapter';
import { SmtpEmailAdapter } from './smtp-email.adapter';

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

/**
 * Primary port implementation.
 * Tries Gmail first (via OAuth access token port). If the token is unavailable or
 * Gmail send fails, falls back to SMTP (Nodemailer).
 */
@Injectable()
export class FallbackEmailAdapter implements IEmailSenderPort {
  private readonly logger = new Logger(FallbackEmailAdapter.name);

  constructor(
    @Inject(OAUTH_ACCESS_TOKEN_PORT)
    private readonly oauthTokens: IOAuthAccessTokenPort,
    private readonly gmailAdapter: GmailEmailAdapter,
    private readonly smtpAdapter: SmtpEmailAdapter,
  ) { }

  async send(message: EmailMessage): Promise<void> {
    let tokenAvailable = false;
    try {
      await this.oauthTokens.getAccessToken({
        provider: 'google',
        scope: GMAIL_SEND_SCOPE,
      });
      tokenAvailable = true;
    } catch {
      this.logger.warn('Gmail token unavailable — falling back to SMTP.');
    }

    if (tokenAvailable) {
      try {
        await this.gmailAdapter.send(message);
        return;
      } catch (err) {
        this.logger.error(
          `Gmail send failed — falling back to SMTP. reason=${(err as Error).message}`,
        );
      }
    }

    await this.smtpAdapter.send(message);
  }
}
