import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiAutoPrimitiveResponse,
  ApiAutoResponse,
  ApiAutoVoidResponse,
  ApiKeyParam,
  ENVELOPE_EXAMPLES,
} from '@ssdev-toolkit/nestjs-core';
import { RequirePermissions, UseApiKey } from '@ssdev-toolkit/nestjs-auth';
import { TriggerCronJobsCommand } from '../../application/commands/trigger-cron-jobs/trigger-cron-jobs.command';
import { CreateCronJobCommand } from '../../application/commands/create-cron-job/create-cron-job.command';
import { UpdateCronJobCommand } from '../../application/commands/update-cron-job/update-cron-job.command';
import { DeleteCronJobCommand } from '../../application/commands/delete-cron-job/delete-cron-job.command';
import { RunCronJobCommand } from '../../application/commands/run-cron-job/run-cron-job.command';
import { GetCronJobsQuery } from '../../application/queries/get-cron-jobs/get-cron-jobs.query';
import { CronJobDto, TriggerResultDto } from '../../application/dtos/cron.dtos';
import {
  CreateCronJobRequestDto,
  UpdateCronJobRequestDto,
} from '../../application/dtos/cron-request.dtos';

@ApiTags(CronController.name)
@Controller('cron')
@ApiSecurity('api-key')
@ApiBearerAuth('jwt')
export class CronController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  /**
   * Called by the external cloud scheduler on each configured interval.
   * Evaluates all enabled job definitions and enqueues any that are due.
   */
  @Post('trigger')
  @UseApiKey()
  @RequirePermissions('create:cron')
  @ApiOperation({ summary: 'Evaluate schedules and enqueue due jobs (called by cloud scheduler)' })
  @ApiHeader({
    name: 'x-cloudscheduler-scheduletime',
    required: false,
    description: 'Scheduled fire time sent by the cloud scheduler',
    example: '2026-03-14T09:30:00.000Z',
  })
  @ApiAutoResponse(TriggerResultDto, { wrapInSuccessResponse: true })
  async trigger(
    @Headers('x-cloudscheduler-scheduletime') scheduleTime?: string,
  ): Promise<TriggerResultDto> {
    return this.commandBus.execute(new TriggerCronJobsCommand(scheduleTime));
  }

  @Get('jobs')
  @RequirePermissions('read:cron')
  @ApiOperation({ summary: 'List all cron job definitions with next-run time' })
  @ApiAutoResponse(CronJobDto, { wrapInSuccessResponse: true, isArray: true })
  async getJobs(): Promise<CronJobDto[]> {
    return this.queryBus.execute(new GetCronJobsQuery());
  }

  @Post('jobs')
  @RequirePermissions('create:cron')
  @ApiOperation({ summary: 'Create or upsert a cron job definition' })
  @ApiAutoResponse(CronJobDto, { status: 201, wrapInSuccessResponse: true })
  async createJob(@Body() dto: CreateCronJobRequestDto): Promise<CronJobDto> {
    return this.commandBus.execute(
      new CreateCronJobCommand({
        name: dto.name,
        description: dto.description,
        expression: dto.expression,
        handler: dto.handler,
        enabled: dto.enabled ?? true,
        inputData: dto.inputData,
      }),
    );
  }

  @Put('jobs/:name')
  @RequirePermissions('update:cron')
  @ApiOperation({ summary: 'Update a cron job definition' })
  @ApiKeyParam('name', 'daily-donation-digest', 'Unique cron job name')
  @ApiAutoResponse(CronJobDto, { wrapInSuccessResponse: true })
  async updateJob(
    @Param('name') name: string,
    @Body() dto: UpdateCronJobRequestDto,
  ): Promise<CronJobDto> {
    return this.commandBus.execute(new UpdateCronJobCommand(name, dto));
  }

  @Delete('jobs/:name')
  @RequirePermissions('delete:cron')
  @ApiOperation({ summary: 'Delete a cron job definition' })
  @ApiKeyParam('name', 'daily-donation-digest', 'Unique cron job name')
  @ApiAutoVoidResponse()
  async deleteJob(@Param('name') name: string): Promise<void> {
    await this.commandBus.execute(new DeleteCronJobCommand(name));
  }

  /**
   * Manually enqueue a specific job immediately, bypassing schedule evaluation.
   * Optionally supply a payload to override the job's stored inputData.
   */
  @Post('run/:name')
  @RequirePermissions('create:cron')
  @ApiOperation({ summary: 'Manually enqueue a specific job immediately' })
  @ApiKeyParam('name', 'daily-donation-digest', 'Unique cron job name')
  @ApiBody({
    required: false,
    description: "Payload forwarded to the job handler, replacing the job's stored inputData",
    schema: {
      type: 'object',
      additionalProperties: true,
      example: { timezone: 'Asia/Kolkata', recipientRole: 'FINANCE_ADMIN' },
    },
  })
  @ApiAutoPrimitiveResponse('string', { description: 'Queue job id of the enqueued run' })
  @ApiOkResponse({
    example: { ...ENVELOPE_EXAMPLES, responsePayload: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' },
  })
  async runJob(
    @Param('name') name: string,
    @Body() body: Record<string, any>,
  ): Promise<string> {
    const result = await this.commandBus.execute(new RunCronJobCommand(name, body));
    return result.id;
  }
}
