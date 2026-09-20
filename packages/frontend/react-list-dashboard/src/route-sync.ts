import type { IListRouteSync, ListRouteState } from '@ssdev-toolkit/list-dashboard-core';

/** In-memory route sync for hosts that do not bind a router. */
export function createMemoryListRouteSync(): IListRouteSync {
  return {
    readFromParams(): ListRouteState {
      return { chip: '', filters: {} };
    },
    mergeFiltersIntoCriteria<T extends Record<string, unknown>>(
      base: T,
      filters: Record<string, unknown>,
    ): T {
      return { ...base, ...filters };
    },
    buildQueryParams(chip: string): Record<string, string | boolean | null> {
      return { chip };
    },
    matchesState(): boolean {
      return true;
    },
  };
}
