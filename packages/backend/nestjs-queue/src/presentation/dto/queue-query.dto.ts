import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { PaginatedQueryDto } from "@ssdev-toolkit/nestjs-core";
import { JobStatus } from "../../domain/enums/job-status.enum";

const JOB_TYPES = [
  "completed",
  "failed",
  "paused",
  "delayed",
  "active",
  "waiting",
  "waiting-children",
] as const;

export class ListJobsQueryDto extends PaginatedQueryDto {
  @ApiProperty({ enum: JOB_TYPES, example: "failed" })
  @IsIn(JOB_TYPES)
  status!: (typeof JOB_TYPES)[number];

  @ApiPropertyOptional({ example: "job_10482" })
  @IsOptional()
  @IsString()
  jobId?: string;
}

export class SearchJobsQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ example: "send-email" })
  @IsOptional()
  @IsString()
  jobName?: string;

  @ApiPropertyOptional({ example: "correspondence" })
  @IsOptional()
  @IsString()
  queueName?: string;

  @ApiPropertyOptional({ enum: JobStatus, example: JobStatus.Failed })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
