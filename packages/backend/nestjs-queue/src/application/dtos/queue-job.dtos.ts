import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '../../domain/enums/job-status.enum';

export class QueueJobSearchResultDto {
  @ApiProperty({ example: 'job_10482' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'send-email' })
  @IsString()
  jobName: string;

  @ApiProperty({ example: 'correspondence' })
  @IsString()
  queueName: string;

  @ApiProperty({ enum: JobStatus, example: JobStatus.Completed })
  @IsString()
  status: JobStatus;

  @ApiProperty({ example: { userId: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' } })
  payload: Record<string, any>;

  @ApiPropertyOptional({ example: 'SMTP connection timed out' })
  @IsOptional()
  @IsString()
  failedReason?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  attemptsMade: number;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  @IsDate()
  enqueuedAt: Date;

  @ApiPropertyOptional({ example: '2026-03-14T09:30:00.000Z' })
  @IsOptional()
  @IsDate()
  startedAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-14T09:30:00.000Z' })
  @IsOptional()
  @IsDate()
  finishedAt?: Date;
}
