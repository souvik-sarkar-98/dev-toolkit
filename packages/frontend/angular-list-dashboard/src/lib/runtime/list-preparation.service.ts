import { Injectable } from '@angular/core';
import {
  ListPreparationSession,
  type ListDashboardConfig,
  type ListFilterCriteria,
  type ListPreparationTrigger,
} from '@ssdev-toolkit/list-dashboard-core';

@Injectable()
export class ListPreparationService {
  private readonly session = new ListPreparationSession<any>();

  get loading(): boolean {
    return this.session.loading;
  }

  /** @deprecated Runtime-owned; retained as writable for source compatibility. */
  set loading(value: boolean) {
    this.session.loading = value;
  }

  get error(): unknown {
    return this.session.error;
  }

  /** @deprecated Runtime-owned; retained as writable for source compatibility. */
  set error(value: unknown) {
    this.session.error = value;
  }

  get results(): ReadonlyMap<string, unknown> {
    return this.session.results;
  }

  /** @deprecated Runtime-owned; retained as writable for source compatibility. */
  set results(value: ReadonlyMap<string, unknown>) {
    this.session.results = value;
  }

  configure<TEntity, TCriteria extends ListFilterCriteria, TContext>(
    definition: ListDashboardConfig<TEntity, TCriteria, TContext>,
    context: TContext,
  ): void {
    this.session.configure(definition, context);
  }

  prepare(trigger: ListPreparationTrigger): Promise<ReadonlyMap<string, unknown>> {
    return this.session.prepare(trigger);
  }

  /** Runs an explicit task id list — used by action forms with `preparationTasks`. */
  prepareTasks(taskIds: readonly string[]): Promise<ReadonlyMap<string, unknown>> {
    return this.session.prepareTasks(taskIds);
  }

  cancel(): void {
    this.session.cancel();
  }
}
