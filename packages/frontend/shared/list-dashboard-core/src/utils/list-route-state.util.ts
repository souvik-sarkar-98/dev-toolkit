import {
  formatCsvQueryParam,
  parseBooleanQueryParam,
  parseCsvQueryParam,
  parseStringQueryParam,
  valuesEqual,
} from './list-route-query.util.js';
import type {
  IListRouteSync,
  ListRouteChipConfig,
  ListRouteFilterBinding,
  ListRouteState,
  QueryParamMapLike,
} from '../types/route.js';

/** Router-free chip + filter query parsing. Hosts only implement navigation. */
export class ListRouteStateSync implements IListRouteSync {
  constructor(
    private readonly chipConfig: ListRouteChipConfig,
    private readonly filterBindings: ListRouteFilterBinding[] = [],
  ) {}

  readFromParams(params: QueryParamMapLike): ListRouteState {
    const chipParam = this.chipConfig.param ?? 'chip';
    const chip = this.chipConfig.normalize(params.get(chipParam)) ?? this.chipConfig.defaultChip;
    const filters: Record<string, unknown> = {};

    for (const binding of this.filterBindings) {
      const raw = params.get(binding.param);
      switch (binding.type) {
        case 'csv':
          filters[binding.criteriaKey] = parseCsvQueryParam(raw);
          break;
        case 'string':
          filters[binding.criteriaKey] = parseStringQueryParam(raw);
          break;
        case 'boolean':
          filters[binding.criteriaKey] = raw != null && raw !== ''
            ? parseBooleanQueryParam(raw)
            : undefined;
          break;
      }
    }

    return { chip, filters };
  }

  buildQueryParams(chip: string, criteria: Record<string, unknown>): Record<string, string | boolean | null> {
    const chipParam = this.chipConfig.param ?? 'chip';
    const queryParams: Record<string, string | boolean | null> = {
      [chipParam]: chip === this.chipConfig.defaultChip ? null : chip,
    };

    for (const binding of this.filterBindings) {
      const value = criteria[binding.criteriaKey];
      switch (binding.type) {
        case 'csv':
          queryParams[binding.param] = formatCsvQueryParam(value as string[] | undefined);
          break;
        case 'string':
          queryParams[binding.param] = typeof value === 'string' && value.trim() ? value.trim() : null;
          break;
        case 'boolean':
          queryParams[binding.param] = value ? true : null;
          break;
      }
    }

    return queryParams;
  }

  mergeFiltersIntoCriteria<T extends Record<string, unknown>>(
    base: T,
    filters: Record<string, unknown>,
  ): T {
    const next: Record<string, unknown> = { ...base };

    for (const binding of this.filterBindings) {
      const value = filters[binding.criteriaKey];
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      const isEmptyString = typeof value === 'string' && !value.trim();
      const isFalseBoolean = binding.type === 'boolean' && !value;

      if (value === undefined || value === null || isEmptyArray || isEmptyString || isFalseBoolean) {
        delete next[binding.criteriaKey];
      } else {
        next[binding.criteriaKey] = value;
      }
    }

    return next as T;
  }

  matchesState(
    routeChip: string,
    activeChip: string,
    criteria: Record<string, unknown>,
    routeFilters: Record<string, unknown>,
  ): boolean {
    if (routeChip !== activeChip) {
      return false;
    }

    return this.filterBindings.every(binding =>
      this.filterValuesEqual(binding, criteria[binding.criteriaKey], routeFilters[binding.criteriaKey]),
    );
  }

  private filterValuesEqual(binding: ListRouteFilterBinding, a: unknown, b: unknown): boolean {
    if (binding.type === 'boolean') {
      return (a === true) === (b === true);
    }
    return valuesEqual(a, b);
  }
}
