import { Injectable } from '@angular/core';
import {
  compileListDashboardConfig,
  ListFormResolver,
  resolveListDashboardConfig,
  type ListDashboardConfig,
  type ListDashboardOperations,
  type ListFilterCriteria,
  type ListFormResolverContext,
  type FilteredListDashboardConfig,
} from '@ssdev-toolkit/list-dashboard-core';

/**
 * Per-dashboard form cache. Host supplies one instance so tenant/route data
 * cannot leak across dashboards.
 */
@Injectable()
export class ListFormCache {
  private readonly resolver = new ListFormResolver();

  async compile<
    TEntity,
    TCriteria extends ListFilterCriteria,
    TContext,
    TOperations extends ListDashboardOperations,
  >(
    definition: ListDashboardConfig<TEntity, TCriteria, TContext, TOperations>,
    context: ListFormResolverContext,
  ): Promise<FilteredListDashboardConfig<TEntity, TCriteria>> {
    const resolved = await resolveListDashboardConfig(
      definition,
      context,
      this.resolver,
    );
    return compileListDashboardConfig(resolved);
  }

  invalidate(formId?: string): void {
    this.resolver.invalidate(formId);
  }
}
