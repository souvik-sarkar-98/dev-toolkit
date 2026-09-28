import type { ListDashboardConfig } from '../config/list-dashboard.config.js';
import type { ListFilterCriteria } from '../models/infinite-list.model.js';
import {
  ListPreparationRunner,
  type ListPreparationTrigger,
} from './list-preparation.runtime.js';
import { aliasPreparationTriggers, canonicalPreparationTrigger } from './preparation-triggers.js';
import { LoadGeneration } from './list-page-state.js';

export class ListPreparationSession<TContext = unknown> {
  loading = false;
  error: unknown;
  results: ReadonlyMap<string, unknown> = new Map();

  private runner?: ListPreparationRunner<TContext>;
  private context?: TContext;
  private readonly generation = new LoadGeneration();
  private activeRun?: AbortController;

  configure<TEntity, TCriteria extends ListFilterCriteria>(
    definition: ListDashboardConfig<TEntity, TCriteria, TContext>,
    context: TContext,
  ): void {
    this.cancel();
    this.context = context;
    if (definition.preparation) {
      this.runner = new ListPreparationRunner(
        definition.preparation.tasks,
        aliasPreparationTriggers(definition.preparation.triggers),
      );
    } else {
      this.runner = undefined;
    }
    this.loading = false;
    this.error = undefined;
    this.results = new Map();
  }

  async prepare(trigger: ListPreparationTrigger): Promise<ReadonlyMap<string, unknown>> {
    return this.run(() =>
      this.runner!.run(
        canonicalPreparationTrigger(trigger),
        this.context as TContext,
        { signal: this.activeRun!.signal },
      ),
    );
  }

  async prepareTasks(taskIds: readonly string[]): Promise<ReadonlyMap<string, unknown>> {
    if (!taskIds.length) return this.results;
    return this.run(() =>
      this.runner!.runTasks(taskIds, this.context as TContext, {
        signal: this.activeRun!.signal,
      }),
    );
  }

  cancel(): void {
    this.activeRun?.abort();
    this.activeRun = undefined;
    this.generation.next();
    this.loading = false;
  }

  private async run(
    execute: () => Promise<ReadonlyMap<string, unknown>>,
  ): Promise<ReadonlyMap<string, unknown>> {
    this.activeRun?.abort();
    const abortController = new AbortController();
    this.activeRun = abortController;
    const run = this.generation.next();
    if (!this.runner) {
      this.activeRun = undefined;
      return this.results;
    }

    this.loading = true;
    this.error = undefined;
    try {
      const results = await execute();
      if (this.generation.isCurrent(run)) {
        this.results = results;
        this.loading = false;
        this.activeRun = undefined;
      }
      return results;
    } catch (error) {
      if (this.generation.isCurrent(run)) {
        this.error = error;
        this.loading = false;
        this.activeRun = undefined;
      }
      throw error;
    }
  }
}
