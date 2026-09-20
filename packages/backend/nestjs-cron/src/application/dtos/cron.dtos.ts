import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class EnqueuedJobDto {
  @ApiProperty({ example: 'daily-donation-digest' })
  @IsString()
  jobName: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsString()
  queueJobId: string;
}

export class SkippedJobDto {
  @ApiProperty({ example: 'daily-donation-digest' })
  @IsString()
  jobName: string;

  @ApiProperty({ example: 'DISABLED' })
  @IsString()
  reason: string;
}

export class TriggerResultDto {
  @ApiProperty({ type: [EnqueuedJobDto] })
  @IsArray()
  @Type(() => EnqueuedJobDto)
  enqueuedJobs: EnqueuedJobDto[];

  @ApiProperty({ type: [SkippedJobDto] })
  @IsArray()
  @Type(() => SkippedJobDto)
  skippedJobs: SkippedJobDto[];
}

export class CronJobDto {
  @ApiProperty({ example: 'daily-donation-digest' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Sends the daily donation digest to finance administrators' })
  @IsString()
  description: string;

  @ApiProperty({ description: '5-part UNIX cron expression', example: '0 3 * * *' })
  @IsString()
  expression: string;

  @ApiProperty({ description: 'Human-readable expression, e.g. "At 08:00 AM"', example: 'At 03:00 AM, every day' })
  @IsString()
  readableExpression: string;

  @ApiProperty({ description: 'BullMQ job name = consumer job class constructor name', example: 'SendDailyDonationDigestJob' })
  @IsString()
  handler: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ type: Date, example: '2026-03-14T09:30:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  nextRun?: Date;

  @ApiPropertyOptional({ example: { timezone: 'Asia/Kolkata', recipientRole: 'FINANCE_ADMIN' } })
  @IsObject()
  @IsOptional()
  inputData?: Record<string, any>;
}
