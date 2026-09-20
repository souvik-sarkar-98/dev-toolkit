import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import { RefDataMap } from '@ssdev-toolkit/list-dashboard-core';
import {
  AppliedListFilter,
  ChipFilter,
  ListFilterCriteria,
  ListRowItem,
} from '@ssdev-toolkit/list-dashboard-core';
import { FilteredListPageAdapter } from '@ssdev-toolkit/list-dashboard-core';
import { ConfiguredListPageAdapter } from '@ssdev-toolkit/list-dashboard-core';
import { ListRouteState, ListRouteSync } from './list-route-sync';

export interface FilteredListPageInitOptions<TCriteria extends ListFilterCriteria> {
  adapter: FilteredListPageAdapter<TCriteria>;
  route: ActivatedRoute;
  router: Router;
  listRouteSync: ListRouteSync;
  refData?: RefDataMap;
  resolveInitialState?: (routeState: ListRouteState) => { chip: string; criteria: TCriteria };
  /** e.g. close detail sheet before chip/filter route apply */
  onBeforeRouteStateApply?: () => void;
  /** e.g. open pending detail/create after list load */
  onAfterListLoaded?: () => void;
  /**
   * Prefetch async filter options before the sheet opens.
   * Call `continueOpen()` when ready; return `false` to defer the default open.
   */
  onFilterOpen?: (continueOpen: () => void) => void | false;
}

/**
 * Orchestrates chip/filter/search/pagination state for config-driven list pages.
 * Pair with {@link FilteredListPageComponent} and a domain {@link FilteredListPageAdapter}.
 */
export class FilteredListPageController<TCriteria extends ListFilterCriteria = ListFilterCriteria> {
  chips: ChipFilter[] = [];
  activeChip = '';
  listItems: ListRowItem[] = [];
  listLoading = false;
  listLoadingMore = false;
  listHasMore = false;
  listSearchText = '';
  listCriteria!: TCriteria;
  appliedFilters: AppliedListFilter[] = [];
  activeFilterCount = 0;
  filterSheetOpen = false;
  filterFormDefinition: FormDefinition | undefined;
  filterFormInitialValues: FormValues = {};
  selectedIds: string[] = [];

  private adapter!: FilteredListPageAdapter<TCriteria>;
  private route!: ActivatedRoute;
  private router!: Router;
  private listRouteSync!: ListRouteSync;
  private refData: RefDataMap = {};
  private listPageIndex = 0;
  private listSub = new Subscription();
  private searchDebounce?: ReturnType<typeof setTimeout>;
  private resolveInitialState?: FilteredListPageInitOptions<TCriteria>['resolveInitialState'];
  private onBeforeRouteStateApply?: () => void;
  private onAfterListLoaded?: () => void;
  private onFilterOpenHook?: (continueOpen: () => void) => void | false;

  init(options: FilteredListPageInitOptions<TCriteria>): void {
    this.adapter = options.adapter;
    this.route = options.route;
    this.router = options.router;
    this.listRouteSync = options.listRouteSync;
    this.refData = options.refData ?? {};
    this.resolveInitialState = options.resolveInitialState;
    this.onBeforeRouteStateApply = options.onBeforeRouteStateApply;
    this.onAfterListLoaded = options.onAfterListLoaded;
    this.onFilterOpenHook = options.onFilterOpen;

    this.chips = this.adapter.buildChips();
    const routeState = this.listRouteSync.readFromParams(this.route.snapshot.queryParamMap);
    const initial = this.resolveInitialState
      ? this.resolveInitialState(routeState)
      : this.defaultInitialState(routeState);

    this.activeChip = initial.chip;
    this.listCriteria = initial.criteria;
    (this.adapter as ConfiguredListPageAdapter<TCriteria>).setRefData?.(this.refData);
    this.syncFilterFormState();
    this.syncAppliedFilters();
    this.subscribeToListRouteChanges();
    this.loadListPage(0, false);
  }

  destroy(): void {
    this.listSub.unsubscribe();
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  setRefData(refData: RefDataMap): void {
    if (!this.adapter) {
      return;
    }
    this.refData = refData;
    (this.adapter as ConfiguredListPageAdapter<TCriteria>).setRefData?.(refData);
    this.syncFilterFormState();
    this.syncAppliedFilters();
  }

  onChipSelect(chipId: string): void {
    if (!this.adapter.isValidChip(chipId)) {
      return;
    }

    let criteria = this.adapter.cloneCriteria(this.adapter.getDefaultCriteriaForChip(chipId));
    const adjusted = this.adapter.onChipSelect?.(chipId, criteria);
    if (adjusted) {
      criteria = adjusted;
    }

    this.listRouteSync.navigate(chipId, criteria);
  }

  onSearchChange(value: string): void {
    this.listSearchText = value;
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    const delay = this.adapter.searchDebounceMs ?? 300;
    this.searchDebounce = setTimeout(() => this.loadListPage(0, false), delay);
  }

  onFilterOpen(): void {
    const continueOpen = () => {
      this.filterFormInitialValues = this.adapter.criteriaToFilterFormValues(
        this.activeChip,
        this.listCriteria,
      );
      this.syncFilterFormState();
      this.filterSheetOpen = true;
    };

    if (this.onFilterOpenHook?.(continueOpen) === false) {
      return;
    }

    continueOpen();
  }

  onFilterSheetClose(): void {
    this.filterSheetOpen = false;
  }

  onFilterSheetApply(values: FormValues): void {
    this.clearSelection();
    this.listCriteria = this.adapter.cloneCriteria(
      this.adapter.filterFormValuesToCriteria(this.activeChip, values, this.listCriteria),
    );
    this.filterSheetOpen = false;
    this.syncFilterFormState();
    this.syncAppliedFilters();
    this.syncListRoute();
    this.loadListPage(0, false);
  }

  onFilterSheetReset(): void {
    this.clearSelection();
    this.listCriteria = this.adapter.cloneCriteria(
      this.adapter.getDefaultCriteriaForChip(this.activeChip),
    );
    this.filterFormInitialValues = this.adapter.criteriaToFilterFormValues(
      this.activeChip,
      this.listCriteria,
    );
    this.syncFilterFormState();
    this.syncAppliedFilters();
    this.syncListRoute();
    this.loadListPage(0, false);
  }

  onPillRemove(pillId: string): void {
    this.clearSelection();
    this.listCriteria = this.adapter.cloneCriteria(
      this.adapter.removeFilterById(this.listCriteria, pillId),
    );
    this.syncFilterFormState();
    this.syncAppliedFilters();
    this.syncListRoute();
    this.loadListPage(0, false);
  }

  onLoadMore(): void {
    if (this.listLoading || this.listLoadingMore || !this.listHasMore) {
      return;
    }
    this.loadListPage(this.listPageIndex + 1, true);
  }

  onSelectionChange(ids: string[]): void {
    this.selectedIds = ids;
  }

  clearSelection(): void {
    this.selectedIds = [];
  }

  updateListItem(updated: ListRowItem): void {
    this.listItems = this.listItems.map(item => (item.id === updated.id ? updated : item));
  }

  prependListItem(item: ListRowItem): void {
    this.listItems = [item, ...this.listItems];
  }

  /** Reload the first page from the data source (e.g. after create). */
  reloadList(): void {
    this.loadListPage(0, false);
  }

  syncListRoute(): void {
    this.listRouteSync.navigate(this.activeChip, this.listCriteria);
  }

  private defaultInitialState(routeState: ListRouteState): { chip: string; criteria: TCriteria } {
    const chip = this.adapter.isValidChip(routeState.chip)
      ? routeState.chip
      : this.adapter.getDefaultChip();
    let criteria = this.adapter.cloneCriteria(this.adapter.getDefaultCriteriaForChip(chip));
    if (this.adapter.buildCriteriaFromRoute) {
      criteria = this.adapter.buildCriteriaFromRoute(chip, routeState.filters, routeState);
    } else {
      criteria = this.listRouteSync.mergeFiltersIntoCriteria(criteria, routeState.filters);
    }
    return { chip, criteria };
  }

  private subscribeToListRouteChanges(): void {
    this.listSub.add(
      this.route.queryParamMap.subscribe(params => {
        const routeState = this.listRouteSync.readFromParams(params);
        const chip = this.adapter.isValidChip(routeState.chip)
          ? routeState.chip
          : this.adapter.getDefaultChip();

        if (!this.listRouteSync.matchesState(chip, this.activeChip, this.listCriteria, routeState.filters)) {
          this.applyListRouteState(chip, routeState.filters, routeState);
        }
      }),
    );
  }

  private applyListRouteState(
    chipId: string,
    routeFilters: Record<string, unknown>,
    routeState: ListRouteState,
  ): void {
    this.onBeforeRouteStateApply?.();
    this.activeChip = chipId;
    this.clearSelection();

    if (this.adapter.buildCriteriaFromRoute) {
      this.listCriteria = this.adapter.buildCriteriaFromRoute(chipId, routeFilters, routeState);
    } else {
      this.listCriteria = this.listRouteSync.mergeFiltersIntoCriteria(
        this.adapter.cloneCriteria(this.adapter.getDefaultCriteriaForChip(chipId)),
        routeFilters,
      );
    }

    this.syncFilterFormState();
    this.syncAppliedFilters();
    this.loadListPage(0, false);
  }

  private loadListPage(pageIndex: number, append: boolean): void {
    if (append) {
      this.listLoadingMore = true;
    } else {
      this.listLoading = true;
      this.listPageIndex = 0;
      this.listHasMore = false;
      this.clearSelection();
    }

    this.listSub.add(
      this.adapter.loadPage({
        chipId: this.activeChip,
        pageIndex,
        pageSize: this.adapter.pageSize,
        append,
        criteria: this.listCriteria,
        searchText: this.listSearchText,
      }).subscribe({
        next: page => {
          this.listPageIndex = page.pageIndex;
          this.listItems = append ? [...this.listItems, ...page.items] : page.items;
          const loadedCount = (page.pageIndex + 1) * page.pageSize;
          this.listHasMore = loadedCount < page.totalSize;
          this.listLoading = false;
          this.listLoadingMore = false;
          this.onAfterListLoaded?.();
        },
        error: () => {
          this.listLoading = false;
          this.listLoadingMore = false;
          this.listHasMore = false;
          this.onAfterListLoaded?.();
        },
      }),
    );
  }

  private syncAppliedFilters(): void {
    this.appliedFilters = this.adapter.buildAppliedFilters(
      this.listCriteria,
      this.refData,
      this.activeChip,
    );
    this.activeFilterCount = this.adapter.countActiveSheetFilters(
      this.listCriteria,
      this.activeChip,
    );
  }

  private syncFilterFormState(): void {
    const nextDefinition = this.adapter.buildFilterFormDefinition(
      this.activeChip,
      this.refData,
      this.listCriteria,
    );

    if (this.adapter.mergeFilterFormDefinition) {
      this.filterFormDefinition = this.adapter.mergeFilterFormDefinition(
        this.filterFormDefinition,
        nextDefinition,
      );
    } else {
      this.filterFormDefinition = nextDefinition;
    }

    this.filterFormInitialValues = this.adapter.criteriaToFilterFormValues(
      this.activeChip,
      this.listCriteria,
    );
  }
}
