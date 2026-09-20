import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { RefDataMap } from '../types/ref-data.js';
import type { ListFilterCriteria } from '../models/infinite-list.model.js';
import {
  ConfiguredListPageAdapter,
  FilteredListPageConfig,
  FilteredListPageRuntimeContext,
} from '../config/filtered-list-page.config.js';
import { mergeFilterFormDefinition } from '../utils/merge-filter-form-definition.util.js';
import type { IListRouteSync, ListRouteState } from '../types/route.js';
import type { FilteredListPageAdapter } from '../adapters/list-page.adapter.js';

export function createListPageAdapter<TCriteria extends ListFilterCriteria>(
  config: FilteredListPageConfig<TCriteria>,
): ConfiguredListPageAdapter<TCriteria> {
  const runtime: FilteredListPageRuntimeContext = {
    asyncFilterOptions: [],
    filterPermissions: {},
  };

  function applyScope(criteria: TCriteria): TCriteria {
    if (runtime.forEventId && config.applyProjectEventScope) {
      return config.applyProjectEventScope(criteria, runtime.forEventId);
    }
    return criteria;
  }

  const adapter: FilteredListPageAdapter<TCriteria> = {
    get pageSize() {
      return config.pageSize;
    },

    get searchDebounceMs() {
      return config.searchDebounceMs;
    },

    buildChips: () => config.chips,
    getDefaultChip: () => config.defaultChip,
    isValidChip: chipId => config.isValidChip(chipId),
    cloneCriteria: criteria => config.cloneCriteria(criteria),

    getDefaultCriteriaForChip: chipId =>
      applyScope(config.getDefaultCriteriaForChip(chipId, runtime)),

    onChipSelect(_chipId, defaultCriteria) {
      return applyScope(defaultCriteria);
    },

    buildCriteriaFromRoute(chipId, routeFilters, _routeState: ListRouteState) {
      let criteria = config.getDefaultCriteriaForChip(chipId, runtime);
      if (runtime.listRouteSync) {
        criteria = runtime.listRouteSync.mergeFiltersIntoCriteria(criteria, routeFilters);
      }
      return applyScope(criteria);
    },

    buildFilterFormDefinition(chipId, refData, criteria) {
      return config.buildFilterFormDefinition(chipId, refData, criteria, runtime);
    },

    mergeFilterFormDefinition(current: FormDefinition | undefined, next: FormDefinition) {
      return mergeFilterFormDefinition(current, next);
    },

    criteriaToFilterFormValues: (chipId, criteria) =>
      config.criteriaToFilterFormValues(chipId, criteria),

    filterFormValuesToCriteria(chipId, values, criteria) {
      return config.filterFormValuesToCriteria(chipId, values, criteria, runtime);
    },

    buildAppliedFilters: (criteria, refData, chipId) =>
      config.buildAppliedFilters(criteria, refData, chipId),

    countActiveSheetFilters: (criteria, chipId) =>
      config.countActiveSheetFilters(criteria, chipId),

    removeFilterById: (criteria, pillId) =>
      config.removeFilterById(criteria, pillId),

    loadPage: query => config.loadPage(query, runtime),
  };

  return Object.assign(adapter, {
    configure(options: {
      forEventId?: string;
      listRouteSync: IListRouteSync;
      filterPermissions?: Record<string, boolean>;
    }): void {
      runtime.forEventId = options.forEventId;
      runtime.listRouteSync = options.listRouteSync;
      runtime.filterPermissions = options.filterPermissions ?? runtime.filterPermissions;
    },

    setAsyncFilterOptions(options: { key: string; label: string }[]): void {
      runtime.asyncFilterOptions = options;
    },

    setRefData(refData: RefDataMap): void {
      runtime.refData = refData;
    },

    getRuntimeContext(): FilteredListPageRuntimeContext {
      return runtime;
    },
  });
}
