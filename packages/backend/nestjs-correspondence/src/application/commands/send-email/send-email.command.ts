import { EmailMessage } from '../../../domain/ports/email-sender.port';

export class SendEmailCommand {
  constructor(public readonly message: EmailMessage) {}
}
