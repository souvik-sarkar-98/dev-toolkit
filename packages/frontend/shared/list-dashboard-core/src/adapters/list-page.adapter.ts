import type { Observable } from 'rxjs';
import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { RefDataMap } from '../types/ref-data.js';
import {
  AppliedListFilter,
  ChipFilter,
  InfiniteListPage,
  InfiniteListQuery,
  ListFilterCriteria,
  ListRowItem,
} from '../models/infinite-list.model.js';
import type { ListRouteState } from '../types/route.js';

/** Domain-specific config for {@link FilteredListPageController}. */
export interface FilteredListPageAdapter<TCriteria extends ListFilterCriteria = ListFilterCriteria> {
  readonly pageSize: number;

  buildChips(): ChipFilter[];
  getDefaultChip(): string;
  isValidChip(chipId: string): boolean;

  cloneCriteria(criteria: TCriteria): TCriteria;
  getDefaultCriteriaForChip(chipId: string): TCriteria;

  /** Merge URL filter params onto chip defaults. Optional route-only overrides (e.g. forEventId). */
  buildCriteriaFromRoute?(
    chipId: string,
    routeFilters: Record<string, unknown>,
    routeState: ListRouteState,
  ): TCriteria;

  buildFilterFormDefinition(
    chipId: string,
    refData: RefDataMap,
    criteria: TCriteria,
  ): FormDefinition;

  /** Preserve dynamic field options when chip unchanged. Return `next` to replace entirely. */
  mergeFilterFormDefinition?(
    current: FormDefinition | undefined,
    next: FormDefinition,
  ): FormDefinition;

  criteriaToFilterFormValues(chipId: string, criteria: TCriteria): FormValues;
  filterFormValuesToCriteria(chipId: string, values: FormValues, criteria: TCriteria): TCriteria;

  buildAppliedFilters(
    criteria: TCriteria,
    refData: RefDataMap,
    chipId: string,
  ): AppliedListFilter[];

  countActiveSheetFilters(criteria: TCriteria, chipId: string): number;
  removeFilterById(criteria: TCriteria, pillId: string): TCriteria;

  loadPage(query: InfiniteListQuery): Observable<InfiniteListPage<ListRowItem>>;

  /** Adjust criteria before navigating on chip change. Return replacement or void to use defaults. */
  onChipSelect?(chipId: string, defaultCriteria: TCriteria): TCriteria | void;

  searchDebounceMs?: number;
}
