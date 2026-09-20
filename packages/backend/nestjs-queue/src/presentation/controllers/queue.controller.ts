import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiAutoPagedResponse,
  ApiAutoResponse,
  ApiKeyParam,
  ENVELOPE_EXAMPLES,
} from "@ssdev-toolkit/nestjs-core";
import { RequirePermissions } from "@ssdev-toolkit/nestjs-auth";
import { CleanJobsCommand } from "../../application/commands/clean-jobs/clean-jobs.command";
import { PauseQueueCommand } from "../../application/commands/pause-queue/pause-queue.command";
import { RemoveJobCommand } from "../../application/commands/remove-job/remove-job.command";
import { ResumeQueueCommand } from "../../application/commands/resume-queue/resume-queue.command";
import { RetryAllFailedJobsCommand } from "../../application/commands/retry-all-failed-jobs/retry-all-failed-jobs.command";
import { RetryJobCommand } from "../../application/commands/retry-job/retry-job.command";
import { GetJobDetailsQuery } from "../../application/queries/get-job-details/get-job-details.query";
import { ListJobsQuery } from "../../application/queries/list-jobs/list-jobs.query";
import { GetQueueStatisticsQuery } from "../../application/queries/get-queue-statistics/get-queue-statistics.query";
import { SearchJobsQuery } from "../../application/queries/search-jobs/search-jobs.query";
import { QueueJobSearchResultDto } from "../../application/dtos/queue-job.dtos";
import { CleanJobsResult, JobDetail, QueueStatistics } from "../dto/queue.dto";
import { ListJobsQueryDto, SearchJobsQueryDto } from "../dto/queue-query.dto";

@ApiTags(QueueController.name)
@Controller("queue")
@ApiBearerAuth("jwt")
@ApiSecurity("api-key")
export class QueueController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Get()
  @ApiOperation({ summary: "Get jobs by status" })
  @RequirePermissions("read:jobs")
  @ApiAutoPagedResponse(JobDetail, {
    status: 200,
    description: "Jobs retrieved successfully",
    isArray: true,
    wrapInSuccessResponse: true,
  })
  async getJobs(@Query() query: ListJobsQueryDto) {
    return this.queryBus.execute(
      new ListJobsQuery({
        pageIndex: query.pageIndex ?? 0,
        pageSize: query.pageSize ?? 20,
        status: query.status as any,
        jobId: query.jobId,
      }),
    );
  }

  @Get("search")
  @ApiOperation({ summary: "Search jobs by name, queue, or status (uses secondary store)" })
  @RequirePermissions("read:jobs")
  @ApiAutoPagedResponse(QueueJobSearchResultDto, {
    status: 200,
    description: "Jobs searched successfully",
    isArray: true,
    wrapInSuccessResponse: true,
  })
  async searchJobs(@Query() query: SearchJobsQueryDto) {
    return this.queryBus.execute(
      new SearchJobsQuery({
        jobName: query.jobName,
        queueName: query.queueName,
        status: query.status,
        pageIndex: query.pageIndex ?? 0,
        pageSize: query.pageSize ?? 20,
      }),
    );
  }

  @Get("details/:jobId")
  @ApiOperation({ summary: "Get job details by ID" })
  @ApiKeyParam("jobId", "job_10482", "Queue job identifier")
  @RequirePermissions("read:jobs")
  @ApiAutoResponse(JobDetail, {
    status: 200,
    description: "Job details retrieved successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async getJobDetails(@Param("jobId") jobId: string): Promise<JobDetail> {
    return this.queryBus.execute(new GetJobDetailsQuery(jobId));
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get queue statistics" })
  @RequirePermissions("read:jobs")
  @ApiAutoResponse(QueueStatistics, {
    status: 200,
    description: "Statistics retrieved successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async getStatistics(): Promise<QueueStatistics> {
    return this.queryBus.execute(new GetQueueStatisticsQuery());
  }

  @Delete("clean-old-jobs")
  @ApiOperation({ summary: "Clean old jobs" })
  @RequirePermissions("delete:jobs")
  @ApiAutoResponse(CleanJobsResult, {
    status: 200,
    description: "Jobs cleaned successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async cleanOldJobs(): Promise<{ completed: string[]; failed: string[] }> {
    return this.commandBus.execute(new CleanJobsCommand());
  }

  @Post("operation/:operation")
  @ApiOperation({ summary: "Pause or resume the queue" })
  @RequirePermissions("update:jobs")
  @ApiParam({ name: "operation", enum: ["pause", "resume"], schema: { example: "pause" } })
  @ApiAutoResponse(String, {
    status: 200,
    description: "Operation completed",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  @ApiOkResponse({ example: { ...ENVELOPE_EXAMPLES, responsePayload: "Queue paused successfully" } })
  async queueOperation(@Param("operation") operation: string): Promise<string> {
    if (operation === "pause") {
      await this.commandBus.execute(new PauseQueueCommand());
    } else if (operation === "resume") {
      await this.commandBus.execute(new ResumeQueueCommand());
    }
    return `Queue ${operation}d successfully`;
  }

  @Delete(":jobId")
  @ApiOperation({ summary: "Remove a job" })
  @ApiKeyParam("jobId", "job_10482", "Queue job identifier")
  @RequirePermissions("delete:jobs")
  @ApiAutoResponse(String, {
    status: 200,
    description: "Job removed successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  @ApiOkResponse({
    example: { ...ENVELOPE_EXAMPLES, responsePayload: "Job 'job_10482' removed successfully" },
  })
  async removeJob(@Param("jobId") jobId: string): Promise<string> {
    await this.commandBus.execute(new RemoveJobCommand(jobId));
    return `Job '${jobId}' removed successfully`;
  }

  @Post("retry/:jobId")
  @ApiOperation({ summary: "Retry a failed job" })
  @ApiKeyParam("jobId", "job_10482", "Queue job identifier")
  @RequirePermissions("update:jobs")
  @ApiAutoResponse(String, {
    status: 200,
    description: "Job queued for retry",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  @ApiOkResponse({
    example: {
      ...ENVELOPE_EXAMPLES,
      responsePayload: "Job 'job_10482' has been queued for retry",
    },
  })
  async retryJob(@Param("jobId") jobId: string): Promise<string> {
    await this.commandBus.execute(new RetryJobCommand(jobId));
    return `Job '${jobId}' has been queued for retry`;
  }

  @Post("retry-all-failed")
  @ApiOperation({ summary: "Retry all failed jobs" })
  @RequirePermissions("update:jobs")
  @ApiAutoResponse(String, {
    status: 200,
    description: "All failed jobs queued for retry",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  @ApiOkResponse({
    example: { ...ENVELOPE_EXAMPLES, responsePayload: "Retry complete. 3 retried, 0 failed" },
  })
  async retryAllFailedJobs(): Promise<string> {
    const result = await this.commandBus.execute(new RetryAllFailedJobsCommand());
    return `Retry complete. ${result.retriedCount} retried, ${result.failedCount} failed`;
  }
}
