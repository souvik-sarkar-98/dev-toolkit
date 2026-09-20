import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiAutoResponse } from '@ssdev-toolkit/nestjs-core';
import { RequirePermissions, UseApiKey } from '@ssdev-toolkit/nestjs-auth';
import { SendEmailCommand } from '../../application/commands/send-email/send-email.command';
import { SendEmailDto, SendEmailResultDto } from '../../application/dtos/send-email.request.dto';

@ApiTags('correspondence / email')
@Controller('correspondence/email')
@ApiSecurity('api-key')
export class EmailProviderController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Sends a fully-resolved HTML email supplied by an external system (e.g. Auth0
   * as a custom email provider). Sends synchronously so the caller can retry on
   * failure. Protected by API key + the `send:email` permission.
   */
  @Post('send')
  @UseApiKey()
  @RequirePermissions('send:email')
  @ApiOperation({ summary: 'Send a fully-resolved HTML email (external provider endpoint)' })
  @ApiAutoResponse(SendEmailResultDto)
  async send(@Body() dto: SendEmailDto): Promise<SendEmailResultDto> {
    await this.commandBus.execute(
      new SendEmailCommand({
        to: dto.to,
        cc: dto.cc,
        bcc: dto.bcc,
        subject: dto.subject,
        html: dto.html,
        text: dto.text,
        from: dto.from,
        attachments: dto.attachments,
      }),
    );
    return { accepted: true };
  }
}
