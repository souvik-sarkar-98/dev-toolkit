import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SendEmailAttachmentDto {
  @ApiProperty({ description: 'Attachment file name.', example: 'donation-receipt-2026-0117.pdf' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Base64-encoded attachment bytes.',
    example: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c+PgplbmRvYmoK',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'MIME type, e.g. application/pdf.', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Content-ID for referencing the attachment inline in the HTML body.',
    example: 'donation-receipt-logo',
  })
  @IsOptional()
  @IsString()
  cid?: string;
}

export class SendEmailDto {
  @ApiProperty({ type: [String], description: 'Recipient email addresses.', example: ['asha.verma@example.org'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiPropertyOptional({ type: [String], description: 'CC email addresses.', example: ['finance.team@example.org'] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ type: [String], description: 'BCC email addresses.', example: ['audit.trail@example.org'] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiProperty({ description: 'Email subject line.', example: 'Your donation receipt' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Fully-resolved HTML body.',
    example: '<p>Dear Asha, thank you for your donation. Your receipt is attached.</p>',
  })
  @IsString()
  @IsNotEmpty()
  html: string;

  @ApiPropertyOptional({
    description: 'Optional plain-text alternative body.',
    example: 'Dear Asha, thank you for your donation. Your receipt is attached.',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'Optional from override. Defaults to the configured sender address.',
    example: 'donations@example.org',
  })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiPropertyOptional({ type: [SendEmailAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendEmailAttachmentDto)
  attachments?: SendEmailAttachmentDto[];
}

export class SendEmailResultDto {
  @ApiProperty({ description: 'Whether the email was accepted and sent.', example: true })
  @IsBoolean()
  accepted: boolean;
}
