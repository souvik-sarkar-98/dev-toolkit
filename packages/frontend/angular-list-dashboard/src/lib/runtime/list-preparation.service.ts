import { Injectable } from '@angular/core';
import {
  ListPreparationRunner,
  type ListDashboardConfig,
  type ListFilterCriteria,
  type ListPreparationTrigger,
} from '@ssdev-toolkit/list-dashboard-core';

@Injectable()
export class ListPreparationService {
  loading = false;
  error: unknown;
  results: ReadonlyMap<string, unknown> = new Map();

  private runner?: ListPreparationRunner<unknown>;
  private context?: unknown;
  private generation = 0;
  private activeRun?: AbortController;

  configure<TEntity, TCriteria extends ListFilterCriteria, TContext>(
    definition: ListDashboardConfig<TEntity, TCriteria, TContext>,
    context: TContext,
  ): void {
    this.cancel();
    this.context = context;
    if (definition.preparation) {
      const triggers = { ...definition.preparation.triggers };
      triggers.init ??= triggers.list;
      triggers.createOpen ??= triggers.create;
      triggers.editPrepare ??= this.mergeTriggerIds(
        triggers.detail,
        triggers.bulkEdit,
      );
      this.runner = new ListPreparationRunner(
        definition.preparation.tasks as never,
        triggers,
      );
    } else {
      this.runner = undefined;
    }
    this.loading = false;
    this.error = undefined;
    this.results = new Map();
  }

  async prepare(trigger: ListPreparationTrigger): Promise<ReadonlyMap<string, unknown>> {
    this.activeRun?.abort();
    const abortController = new AbortController();
    this.activeRun = abortController;
    const run = ++this.generation;
    const runner = this.runner;
    if (!runner) {
      this.activeRun = undefined;
      return this.results;
    }

    this.loading = true;
    this.error = undefined;
    try {
      const results = await runner.run(
        this.canonicalTrigger(trigger),
        this.context,
        { signal: abortController.signal },
      );
      if (run === this.generation) {
        this.results = results;
        this.loading = false;
        this.activeRun = undefined;
      }
      return results;
    } catch (error) {
      if (run === this.generation) {
        this.error = error;
        this.loading = false;
        this.activeRun = undefined;
      }
      throw error;
    }
  }

  /** Runs an explicit task id list — used by action forms with `preparationTasks`. */
  async prepareTasks(taskIds: readonly string[]): Promise<ReadonlyMap<string, unknown>> {
    if (!taskIds.length) return this.results;
    this.activeRun?.abort();
    const abortController = new AbortController();
    this.activeRun = abortController;
    const run = ++this.generation;
    const runner = this.runner;
    if (!runner) {
      this.activeRun = undefined;
      return this.results;
    }

    this.loading = true;
    this.error = undefined;
    try {
      const results = await runner.runTasks(taskIds, this.context, {
        signal: abortController.signal,
      });
      if (run === this.generation) {
        this.results = results;
        this.loading = false;
        this.activeRun = undefined;
      }
      return results;
    } catch (error) {
      if (run === this.generation) {
        this.error = error;
        this.loading = false;
        this.activeRun = undefined;
      }
      throw error;
    }
  }

  cancel(): void {
    this.activeRun?.abort();
    this.activeRun = undefined;
    this.generation += 1;
    this.loading = false;
  }

  private canonicalTrigger(
    trigger: ListPreparationTrigger,
  ): ListPreparationTrigger {
    switch (trigger) {
      case 'list': return 'init';
      case 'create': return 'createOpen';
      case 'detail':
      case 'bulkEdit':
        return 'editPrepare';
      default:
        return trigger;
    }
  }

  private mergeTriggerIds(
    first: string[] | undefined,
    second: string[] | undefined,
  ): string[] | undefined {
    return first || second ? [...new Set([...(first ?? []), ...(second ?? [])])] : undefined;
  }
}
