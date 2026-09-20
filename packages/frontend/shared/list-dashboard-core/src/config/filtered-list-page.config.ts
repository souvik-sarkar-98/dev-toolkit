import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { Observable } from 'rxjs';
import type { RefDataMap } from '../types/ref-data.js';
import {
  AppliedListFilter,
  ChipFilter,
  InfiniteListPage,
  InfiniteListQuery,
  ListFilterCriteria,
  ListRowItem,
} from '../models/infinite-list.model.js';
import type {
  IListRouteSync,
  ListRouteFilterBinding,
  ListRouteChipConfig,
  ListRouteState,
} from '../types/route.js';
import type { FilteredListPageAdapter } from '../adapters/list-page.adapter.js';

/**
 * Runtime context passed to list config hooks (async filter options, route scope, etc.).
 * Populated by the adapter after {@link ConfiguredListPageAdapter.configure} / setters;
 * config callbacks receive this when they need live options or scope.
 */
export interface FilteredListPageRuntimeContext {
  /** Options for async/select filters loaded after page init (key = value, label = display). */
  asyncFilterOptions?: { key: string; label: string }[];
  /** Permission flags keyed by filter id; use to hide or disable sheet filters. */
  filterPermissions?: Record<string, boolean>;
  /** Optional project/event id that scopes list criteria when {@link FilteredListPageConfig.applyProjectEventScope} is set. */
  forEventId?: string;
  /** Route sync helper used to merge URL filters into criteria and rebuild query params. */
  listRouteSync?: IListRouteSync;
  /** Reference data (lookups) available when building filter forms and applied-filter pills. */
  refData?: RefDataMap;
}

/**
 * Declarative list-page config consumed by {@link createListPageAdapter}.
 * Feature modules implement this once; the adapter wires chips, filters, route, and paging.
 */
export interface FilteredListPageConfig<TCriteria extends ListFilterCriteria> {
  /** Number of rows fetched per infinite-scroll page. */
  pageSize: number;
  /**
   * Debounce (ms) for the list search box before criteria update / reload.
   * Omit to use the controller default.
   */
  searchDebounceMs?: number;
  /** Chip definitions shown above the list (id, label, optional badge). */
  chips: ChipFilter[];
  /** Chip id selected when the route has no chip (or an invalid one). */
  defaultChip: string;
  /** Returns true if `chipId` is allowed for this list (guards route / UI chip changes). */
  isValidChip: (chipId: string) => boolean;
  /**
   * URL sync for chip + filter query params.
   * `chipConfig` names/normalizes the chip param; `filterBindings` map query params to criteria keys.
   */
  route: {
    /** Chip query-param name, default chip, and normalize from raw URL value. */
    chipConfig: ListRouteChipConfig;
    /** Bindings from URL query params to criteria fields (csv / string / boolean). */
    filterBindings: ListRouteFilterBinding[];
  };
  /** Deep (or sufficient) clone so mutations do not share references with active criteria. */
  cloneCriteria: (criteria: TCriteria) => TCriteria;
  /**
   * Baseline criteria for a chip (before route merge and optional project/event scope).
   * Called on chip change and when building criteria from the route.
   */
  getDefaultCriteriaForChip: (
    chipId: string,
    ctx: FilteredListPageRuntimeContext,
  ) => TCriteria;
  /**
   * Builds the filter-sheet {@link FormDefinition} for the active chip,
   * using current criteria and runtime context (ref data, permissions, async options).
   */
  buildFilterFormDefinition: (
    chipId: string,
    refData: RefDataMap,
    criteria: TCriteria,
    ctx: FilteredListPageRuntimeContext,
  ) => FormDefinition;
  /** Maps active criteria into filter-sheet form values for the given chip. */
  criteriaToFilterFormValues: (chipId: string, criteria: TCriteria) => FormValues;
  /**
   * Maps submitted filter-sheet values back into criteria for the given chip.
   * Receives current criteria as a base; return the updated criteria object.
   */
  filterFormValuesToCriteria: (
    chipId: string,
    values: FormValues,
    criteria: TCriteria,
    ctx: FilteredListPageRuntimeContext,
  ) => TCriteria;
  /**
   * Builds applied-filter pills shown under the chips from current criteria.
   * Use `refData` / chip to resolve display labels.
   */
  buildAppliedFilters: (
    criteria: TCriteria,
    refData: RefDataMap,
    chipId: string,
  ) => AppliedListFilter[];
  /**
   * Count of sheet filters currently active (excludes search/chip as appropriate).
   * Drives the filter-button badge.
   */
  countActiveSheetFilters: (criteria: TCriteria, chipId: string) => number;
  /**
   * Removes one applied-filter pill by id and returns updated criteria.
   * `pillId` matches {@link AppliedListFilter.id} from {@link buildAppliedFilters}.
   */
  removeFilterById: (criteria: TCriteria, pillId: string) => TCriteria;
  /**
   * Loads one page of list rows for the infinite list.
   * `query` includes chip, criteria, page index, and page size; use `ctx` for scoped APIs.
   */
  loadPage: (
    query: InfiniteListQuery,
    ctx: FilteredListPageRuntimeContext,
  ) => Observable<InfiniteListPage<ListRowItem>>;
  /**
   * Optional: stamp project/event scope onto criteria when `forEventId` is set.
   * Applied on chip select, default criteria, and route-built criteria.
   */
  applyProjectEventScope?: (criteria: TCriteria, forEventId: string) => TCriteria;
}

/**
 * Adapter returned by {@link createListPageAdapter}: list behavior plus runtime wiring.
 */
export interface ConfiguredListPageAdapter<TCriteria extends ListFilterCriteria>
  extends FilteredListPageAdapter<TCriteria> {
  /**
   * Injects route sync and optional event scope / filter permissions into the runtime context.
   * Call once when the host page is ready (before first load).
   */
  configure(options: {
    /** Scopes list queries / criteria when {@link FilteredListPageConfig.applyProjectEventScope} is set. */
    forEventId?: string;
    /** Syncs chip + filters with the URL. */
    listRouteSync: IListRouteSync;
    /** Permission map for filter visibility / enablement. */
    filterPermissions?: Record<string, boolean>;
  }): void;
  /** Updates async filter option lists (e.g. after a remote lookup completes). */
  setAsyncFilterOptions(options: { key: string; label: string }[]): void;
  /** Supplies reference data used when building filter forms and applied-filter labels. */
  setRefData(refData: RefDataMap): void;
  /** Snapshot of the live runtime context passed into config hooks. */
  getRuntimeContext(): FilteredListPageRuntimeContext;
}

export type { ListRouteState };
