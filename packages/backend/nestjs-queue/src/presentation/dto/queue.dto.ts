import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import * as bullmq from "bullmq";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export type JobOptions = bullmq.JobsOptions;
export type Job<TData = unknown, TResult = unknown> = bullmq.Job<TData, TResult>;

export interface JobExecutionContext {
  addChildJob: <T = any>(name: string, data: T, options?: JobOptions) => string;
}

/** Internal type alias — not exported from index.ts */
export type JobProcessor<TData = unknown, TResult = unknown> = (
  job: Job<TData, TResult>,
  ctx: JobExecutionContext,
) => Promise<TResult>;

export interface JobData {
  [key: string]: any;
}

export class JobMetrics {
  @ApiProperty({ example: 42 }) @IsNumber() total: number;
  @ApiProperty({ example: 35 }) @IsNumber() completed: number;
  @ApiProperty({ example: 2 }) @IsNumber() failed: number;
  @ApiProperty({ example: 1 }) @IsNumber() active: number;
  @ApiProperty({ example: 2 }) @IsNumber() waiting: number;
  @ApiProperty({ example: 1 }) @IsNumber() delayed: number;
  @ApiProperty({ example: 1 }) @IsNumber() waitingChildren: number;
  @ApiProperty({ example: 95 }) @IsNumber() successRate: number;
  @ApiProperty({ example: 5 }) @IsNumber() failureRate: number;
}

export class JobPerformanceMetrics {
  @ApiProperty({ example: 1500 }) @IsNumber() averageProcessingTime: number;
  @ApiProperty({ example: 320 }) @IsNumber() fastestJob: number;
  @ApiProperty({ example: 4200 }) @IsNumber() slowestJob: number;
  @ApiProperty({ example: 63000 }) @IsNumber() totalProcessingTime: number;
}

export class JobDetail {
  @ApiPropertyOptional({ example: "job_10482" }) @IsString() id?: string;
  @ApiPropertyOptional({ example: "send-email" }) @IsString() name?: string;
  @ApiProperty({ example: { userId: "b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41" } }) @IsObject() data: JobData;
  @ApiProperty({ example: { attempts: 3, delay: 0, repeat: { pattern: "0 */6 * * *" } } }) @IsObject() opts: JobOptions;
  @ApiProperty({ example: "completed" }) @IsObject() state: bullmq.JobState | "unknown";
  @ApiProperty({ example: 100 }) @IsObject() progress: bullmq.JobProgress;
  @ApiProperty({ required: false, example: { delivered: true } }) @IsOptional() returnvalue: unknown;
  @ApiProperty({ required: false, example: "Job processing failed.", description: "Client-safe failure summary" }) @IsOptional() @IsString() failedReason: string;
  @ApiPropertyOptional({ example: "2026-03-14T09:30:00.000Z" }) @IsDate() processedOn?: Date;
  @ApiPropertyOptional({ example: "2026-03-14T09:30:00.000Z" }) @IsDate() finishedOn?: Date;
  @ApiPropertyOptional({ example: "2026-03-14T09:30:00.000Z" }) @IsDate() timestamp?: Date;
  @ApiProperty({ example: 1 }) @IsNumber() attemptsMade: number;
  @ApiProperty({ example: 0 }) @IsNumber() delay: number;
  @ApiProperty({ required: false, example: [], description: "Internal stack traces are not exposed" }) @IsOptional() @IsArray() stacktrace: string[];
  @ApiPropertyOptional({ example: [], description: "Internal job logs are not exposed" }) @IsOptional() @IsArray() logs?: string[];
}

export class QueueHealth {
  @ApiProperty({ example: "degraded" }) @IsString() status: "healthy" | "unhealthy" | "degraded" | "paused" | "error";
  @ApiProperty({ example: ["2 jobs failed in the last hour"] }) @IsArray() @IsString({ each: true }) issues: string[];
  @ApiProperty({ example: false }) @IsBoolean() isPaused: boolean;
}

export class CleanJobsResult {
  @ApiProperty({ example: ["job_10480", "job_10481"] }) @IsArray() @IsString({ each: true }) completed: string[];
  @ApiProperty({ example: ["job_10475"] }) @IsArray() @IsString({ each: true }) failed: string[];
}

export class QueueStatistics {
  @ApiProperty() @IsObject() metrics: JobMetrics;
  @ApiProperty() @IsObject() performance: JobPerformanceMetrics;
  @ApiProperty() @IsObject() health: QueueHealth;
  @ApiProperty({ example: "2026-03-14T09:30:00.000Z" }) @IsDate() timestamp: Date;
}
