export type ListRouteFilterType = 'csv' | 'string' | 'boolean';

/** Maps a URL query param to a key on the list criteria object. */
export interface ListRouteFilterBinding {
  param: string;
  criteriaKey: string;
  type: ListRouteFilterType;
}

export interface ListRouteChipConfig {
  /** Query param name. Defaults to `chip`. */
  param?: string;
  defaultChip: string;
  normalize: (chip: string | null) => string | undefined;
}

export interface ListRouteState {
  chip: string;
  filters: Record<string, unknown>;
}

/** Minimal query-param map — compatible with Angular {@link ParamMap}. */
export interface QueryParamMapLike {
  get(name: string): string | null;
}

/** Route snapshot with resolver data — compatible with Angular {@link ActivatedRoute}. */
export interface RouteSnapshotLike {
  snapshot: {
    data: Record<string, unknown>;
  };
}

/** Framework-agnostic list route sync contract (implemented by Angular {@link ListRouteSync}). */
export interface IListRouteSync {
  readFromParams(params: QueryParamMapLike): ListRouteState;
  mergeFiltersIntoCriteria<T extends Record<string, unknown>>(
    base: T,
    filters: Record<string, unknown>,
  ): T;
  buildQueryParams(
    chip: string,
    criteria: Record<string, unknown>,
  ): Record<string, string | boolean | null>;
  matchesState(
    routeChip: string,
    activeChip: string,
    criteria: Record<string, unknown>,
    routeFilters: Record<string, unknown>,
  ): boolean;
}
