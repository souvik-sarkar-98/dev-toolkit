import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import {
  ListRouteStateSync,
  type ListRouteFilterBinding,
  type ListRouteChipConfig,
  type ListRouteState,
} from '@ssdev-toolkit/list-dashboard-core';

export type {
  ListRouteFilterBinding,
  ListRouteChipConfig,
  ListRouteState,
} from '@ssdev-toolkit/list-dashboard-core';
export type ListRouteFilterType = import('@ssdev-toolkit/list-dashboard-core').ListRouteFilterType;

/**
 * Angular adapter: core query parse/format plus Router navigation.
 */
export class ListRouteSync {
  private readonly core: ListRouteStateSync;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    chipConfig: ListRouteChipConfig,
    filterBindings: ListRouteFilterBinding[] = [],
  ) {
    this.core = new ListRouteStateSync(chipConfig, filterBindings);
  }

  readFromParams(params: ParamMap): ListRouteState {
    return this.core.readFromParams(params);
  }

  buildQueryParams(chip: string, criteria: Record<string, unknown>): Record<string, string | boolean | null> {
    return this.core.buildQueryParams(chip, criteria);
  }

  navigate(chip: string, criteria: Record<string, unknown>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildQueryParams(chip, criteria),
      queryParamsHandling: 'merge',
    });
  }

  mergeFiltersIntoCriteria<T extends Record<string, unknown>>(
    base: T,
    filters: Record<string, unknown>,
  ): T {
    return this.core.mergeFiltersIntoCriteria(base, filters);
  }

  matchesState(
    routeChip: string,
    activeChip: string,
    criteria: Record<string, unknown>,
    routeFilters: Record<string, unknown>,
  ): boolean {
    return this.core.matchesState(routeChip, activeChip, criteria, routeFilters);
  }
}
