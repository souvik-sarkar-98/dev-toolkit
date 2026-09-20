/**
 * Cron2Module.forRoot / forRootAsync unit tests.
 * Inspects the returned DynamicModule without running NestJS DI.
 */

jest.mock('@ssdev-toolkit/nestjs-cron/application/commands/trigger-cron-jobs/trigger-cron-jobs.handler', () => ({
  TriggerCronJobsHandler: class TriggerCronJobsHandler { },
}));
jest.mock('@ssdev-toolkit/nestjs-cron/application/commands/create-cron-job/create-cron-job.handler', () => ({
  CreateCronJobHandler: class CreateCronJobHandler { },
}));
jest.mock('@ssdev-toolkit/nestjs-cron/application/commands/update-cron-job/update-cron-job.handler', () => ({
  UpdateCronJobHandler: class UpdateCronJobHandler { },
}));
jest.mock('@ssdev-toolkit/nestjs-cron/application/commands/delete-cron-job/delete-cron-job.handler', () => ({
  DeleteCronJobHandler: class DeleteCronJobHandler { },
}));
jest.mock('@ssdev-toolkit/nestjs-cron/application/commands/run-cron-job/run-cron-job.handler', () => ({
  RunCronJobHandler: class RunCronJobHandler { },
}));
jest.mock('@ssdev-toolkit/nestjs-cron/application/queries/get-cron-jobs/get-cron-jobs.handler', () => ({
  GetCronJobsHandler: class GetCronJobsHandler { },
}));
jest.mock('@ssdev-toolkit/nestjs-cron/presentation/controllers/cron.controller', () => ({
  CronController: class CronController { },
}));
jest.mock('@nestjs/cqrs', () => ({
  CqrsModule: class CqrsModule { },
  CommandHandler: () => () => { },
  QueryHandler: () => () => { },
  EventsHandler: () => () => { },
  CommandBus: class CommandBus { },
  QueryBus: class QueryBus { },
  ICommandHandler: class { },
  IQueryHandler: class { },
}));

import { Cron2Module } from '@ssdev-toolkit/nestjs-cron/cron.module';
import { CRON2_OPTIONS } from '@ssdev-toolkit/nestjs-cron/infrastructure/cron-options.token';
import { CRON_JOB_STORE_PORT } from '@ssdev-toolkit/nestjs-cron/domain/ports/cron-job-store.port';
import { CRON_JOB_QUEUE_PORT } from '@ssdev-toolkit/nestjs-cron/domain/ports/cron-job-queue.port';

describe('Cron2Module', () => {
  describe('forRoot()', () => {
    it('returns a DynamicModule object', () => {
      const mod = Cron2Module.forRoot();
      expect(mod).toBeDefined();
      expect(typeof mod).toBe('object');
    });

    it('identifies Cron2Module as the module class', () => {
      const mod = Cron2Module.forRoot();
      expect(mod.module).toBe(Cron2Module);
    });

    it('provides CRON2_OPTIONS with the validated options', () => {
      const mod = Cron2Module.forRoot({ timezone: 'UTC' });
      const provider = (mod.providers as any[]).find((p) => p.provide === CRON2_OPTIONS);
      expect(provider).toBeDefined();
      expect(provider.useValue.timezone).toBe('UTC');
    });

    it('does not register in-package port adapters', () => {
      const mod = Cron2Module.forRoot();
      const storeProvider = (mod.providers as any[]).find((p) => p.provide === CRON_JOB_STORE_PORT);
      const queueProvider = (mod.providers as any[]).find((p) => p.provide === CRON_JOB_QUEUE_PORT);
      expect(storeProvider).toBeUndefined();
      expect(queueProvider).toBeUndefined();
    });

    it('does not import JsonStoreModule or QueueModule', () => {
      const mod = Cron2Module.forRoot();
      expect(mod.imports).toEqual(expect.arrayContaining([expect.anything()]));
      const importModules = (mod.imports as any[]).map((i) => i.module?.name ?? i);
      expect(importModules).not.toContain('JsonStoreModule');
      expect(importModules).not.toContain('QueueModule');
    });

    it('registers CronController', () => {
      const mod = Cron2Module.forRoot();
      expect(mod.controllers).toBeDefined();
      expect((mod.controllers as any[]).length).toBeGreaterThan(0);
    });

    it('includes command and query handlers as providers', () => {
      const mod = Cron2Module.forRoot();
      expect((mod.providers as any[]).length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('forRootAsync()', () => {
    it('returns a DynamicModule with the async factory pattern', () => {
      const mod = Cron2Module.forRootAsync({
        useFactory: () => ({ timezone: 'UTC' }),
      });
      expect(mod.module).toBe(Cron2Module);
    });

    it('stores the async useFactory on the CRON2_OPTIONS provider', () => {
      const mod = Cron2Module.forRootAsync({
        useFactory: () => ({ timezone: 'Europe/London' }),
      });
      const provider = (mod.providers as any[]).find((p) => p.provide === CRON2_OPTIONS);
      expect(typeof provider.useFactory).toBe('function');
    });

    it('validates and returns options from the async factory', async () => {
      const mod = Cron2Module.forRootAsync({
        useFactory: () => ({ timezone: 'America/Chicago' }),
      });
      const provider = (mod.providers as any[]).find((p) => p.provide === CRON2_OPTIONS);
      const result = await provider.useFactory();
      expect(result.timezone).toBe('America/Chicago');
    });
  });
});
