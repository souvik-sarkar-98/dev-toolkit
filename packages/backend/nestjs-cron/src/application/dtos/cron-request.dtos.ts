import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCronJobRequestDto {
  @ApiProperty({ description: 'Unique job name', example: 'daily-donation-digest' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Sends the daily donation digest to finance administrators' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: '5-field cron expression, e.g. "0 8 * * *"', example: '0 3 * * *' })
  @IsString()
  @IsNotEmpty()
  expression: string;

  @ApiProperty({
    description:
      'BullMQ job name — must match the consumer\'s job class constructor name, e.g. "SendDailyReportJob"',
    example: 'SendDailyDonationDigestJob',
  })
  @IsString()
  @IsNotEmpty()
  handler: string;

  @ApiPropertyOptional({ default: true, example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Default payload forwarded to the consumer handler',
    example: { timezone: 'Asia/Kolkata', recipientRole: 'FINANCE_ADMIN' },
  })
  @IsObject()
  @IsOptional()
  inputData?: Record<string, any>;
}

export class UpdateCronJobRequestDto {
  @ApiPropertyOptional({ example: 'Sends the daily donation digest to finance administrators' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '5-field cron expression', example: '0 3 * * *' })
  @IsString()
  @IsOptional()
  expression?: string;

  @ApiPropertyOptional({ example: 'SendDailyDonationDigestJob' })
  @IsString()
  @IsOptional()
  handler?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ example: { timezone: 'Asia/Kolkata', recipientRole: 'FINANCE_ADMIN' } })
  @IsObject()
  @IsOptional()
  inputData?: Record<string, any>;
}
