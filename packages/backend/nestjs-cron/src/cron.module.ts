import { DynamicModule, Injectable, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import {
  BaseDynamicModule,
  BaseModuleValidator,
  DynamicModuleAsyncOptions,
  registerModuleValidator,
} from '@ssdev-toolkit/nestjs-core';

import { Cron2ModuleOptions, Cron2OptionsSchema } from './cron.schema';
import { CRON2_OPTIONS } from './infrastructure/cron-options.token';

import { CRON_JOB_STORE_PORT } from './domain/ports/cron-job-store.port';
import { CRON_JOB_QUEUE_PORT } from './domain/ports/cron-job-queue.port';

import { TriggerCronJobsHandler } from './application/commands/trigger-cron-jobs/trigger-cron-jobs.handler';
import { CreateCronJobHandler } from './application/commands/create-cron-job/create-cron-job.handler';
import { UpdateCronJobHandler } from './application/commands/update-cron-job/update-cron-job.handler';
import { DeleteCronJobHandler } from './application/commands/delete-cron-job/delete-cron-job.handler';
import { RunCronJobHandler } from './application/commands/run-cron-job/run-cron-job.handler';

import { GetCronJobsHandler } from './application/queries/get-cron-jobs/get-cron-jobs.handler';

import { CronController } from './presentation/controllers/cron.controller';

export type { Cron2ModuleOptions } from './cron.schema';

export interface Cron2ModuleAsyncOptions
  extends DynamicModuleAsyncOptions<Cron2ModuleOptions> { }

const CRON_MODULE_VALIDATOR = Symbol('Cron2Module.internalValidator');

@Injectable()
class Cron2ModuleValidator extends BaseModuleValidator {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }

  protected getModuleName(): string {
    return 'Cron2Module';
  }

  protected validateModule(): void {
    this.requirePort(
      CRON_JOB_STORE_PORT,
      'Register { provide: CRON_JOB_STORE_PORT, useClass: JsonStoreCronJobAdapter } in IntegrationsModule. Requires JsonStoreModule.',
    );
    this.requirePort(
      CRON_JOB_QUEUE_PORT,
      'Register { provide: CRON_JOB_QUEUE_PORT, useClass: QueueCronJobAdapter } in IntegrationsModule. Requires QueueModule.forRootAsync().',
    );
  }
}

const COMMAND_HANDLERS = [
  TriggerCronJobsHandler,
  CreateCronJobHandler,
  UpdateCronJobHandler,
  DeleteCronJobHandler,
  RunCronJobHandler,
];

const QUERY_HANDLERS = [GetCronJobsHandler];

/**
 * Cron scheduling module — evaluates job definitions and enqueues due work to BullMQ.
 *
 * **Host app requirements (including standalone consumers):**
 * - Import `CoreModule` once in the root `AppModule` so `SuccessResponseInterceptor`
 *   wraps controller responses. Controllers return raw DTOs — do not construct
 *   `SuccessResponse` manually.
 * - Register `CRON_JOB_STORE_PORT` and `CRON_JOB_QUEUE_PORT` adapters (see validator messages).
 */
@Module({})
export class Cron2Module extends BaseDynamicModule {
  static forRoot(options: Cron2ModuleOptions = {}): DynamicModule {
    return Cron2Module._build([
      Cron2Module.createOptionsProvider(CRON2_OPTIONS, Cron2OptionsSchema, options),
    ]);
  }

  static forRootAsync(options: Cron2ModuleAsyncOptions): DynamicModule {
    return Cron2Module._build(
      [
        {
          ...Cron2Module.createAsyncOptionsProvider(CRON2_OPTIONS, Cron2OptionsSchema, options),
        },
      ],
      options.imports,
    );
  }

  private static _build(
    optionsProviders: any[],
    extraImports: any[] = [],
  ): DynamicModule {
    return {
      module: Cron2Module,
      imports: [...extraImports, CqrsModule],
      controllers: [CronController],
      providers: [
        ...optionsProviders,
        registerModuleValidator(CRON_MODULE_VALIDATOR, Cron2ModuleValidator),
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
      ],
      exports: [],
    };
  }
}
