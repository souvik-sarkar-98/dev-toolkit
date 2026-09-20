import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IEmailSenderPort } from '../../../domain/ports/email-sender.port';
import { SendEmailCommand } from './send-email.command';

@CommandHandler(SendEmailCommand)
export class SendEmailHandler implements ICommandHandler<SendEmailCommand> {
  constructor(
    @Inject(IEmailSenderPort)
    private readonly emailSender: IEmailSenderPort,
  ) {}

  async execute(command: SendEmailCommand): Promise<void> {
    await this.emailSender.send(command.message);
  }
}
