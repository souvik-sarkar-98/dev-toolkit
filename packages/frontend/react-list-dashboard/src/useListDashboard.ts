import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import {
  createListPageAdapter,
  ListDashboardRuntime,
  type FilteredListDashboardConfig,
  type FilteredListDashboardPermissions,
  type ListActionDef,
  type ListDetailSection,
  type ListFilterCriteria,
  type ListRowItem,
} from '@ssdev-toolkit/list-dashboard-core';
import { firstAsyncValue } from './async.js';
import { createMemoryListRouteSync } from './route-sync.js';
import type { ListDashboardController, UseListDashboardOptions } from './types.js';

function entityFromRow<TEntity>(row: ListRowItem<TEntity>): TEntity | undefined {
  return row.payload as TEntity | undefined;
}

function visibleActions(
  actions: ListActionDef[] | undefined,
  permissions: FilteredListDashboardPermissions,
  chipId: string,
  selection: unknown[],
  entity?: unknown,
): ListActionDef[] {
  return (actions ?? []).filter(
    (action) =>
      !action.when ||
      action.when({ permissions, activeChip: chipId, selection, entity }),
  );
}

export function useListDashboard<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext = unknown,
>(
  options: UseListDashboardOptions<TEntity, TCriteria, TContext>,
): ListDashboardController<TEntity, TCriteria> {
  const { config, refData = {}, forEventId, formContext, listRouteSync } = options;
  const runtimeRef = useRef(new ListDashboardRuntime<TContext>());
  const [compiled, setCompiled] =
    useState<FilteredListDashboardConfig<TEntity, TCriteria>>();
  const [compiling, setCompiling] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [chipId, setChipId] = useState(config.list.defaultChip);
  const [criteria, setCriteria] = useState<TCriteria>(() =>
    config.list.getDefaultCriteriaForChip(config.list.defaultChip, {}),
  );
  const [searchText, setSearchTextState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<ListRowItem<TEntity>[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedEntity, setSelectedEntity] = useState<TEntity>();
  const [selectedRow, setSelectedRow] = useState<ListRowItem<TEntity>>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailSections, setDetailSections] = useState<ListDetailSection[]>([]);
  const [detailTitle, setDetailTitle] = useState<string>();
  const [filterForm, setFilterForm] = useState<FormDefinition>();
  const [filterValues, setFilterValues] = useState<FormValues>({});
  const [createForm, setCreateForm] = useState<FormDefinition>();
  const [createValues, setCreateValues] = useState<FormValues>({});
  const loadGen = useRef(0);

  const adapter = useMemo(() => {
    if (!compiled) return undefined;
    const next = createListPageAdapter(compiled.list);
    next.configure({
      forEventId,
      listRouteSync: listRouteSync ?? createMemoryListRouteSync(),
    });
    next.setRefData(refData);
    return next;
  }, [compiled, forEventId, listRouteSync, refData]);

  useEffect(() => {
    let cancelled = false;
    setCompiling(true);
    runtimeRef.current
      .compile<TEntity, TCriteria>(config, formContext ?? { dashboardId: config.meta.id, refData })
      .then((result) => {
        if (cancelled) return;
        setCompiled(result);
        setChipId(result.list.defaultChip);
        setCriteria(result.list.getDefaultCriteriaForChip(result.list.defaultChip, { refData }));
        setCompiling(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setCompiling(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config, formContext, refData]);

  const pageSize = adapter?.pageSize ?? config.list.pageSize;
  const debounceMs = adapter?.searchDebounceMs ?? 300;

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchText), debounceMs);
    return () => window.clearTimeout(handle);
  }, [searchText, debounceMs]);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!adapter) return;
      const gen = ++loadGen.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(undefined);
      try {
        const page = await firstAsyncValue(
          adapter.loadPage({
            chipId,
            pageIndex: nextPage,
            pageSize,
            append,
            criteria,
            searchText: debouncedSearch,
          }),
        );
        if (gen !== loadGen.current) return;
        setTotalSize(page.totalSize);
        setPageIndex(page.pageIndex);
        setItems((current) => (append ? [...current, ...page.items] : page.items) as ListRowItem<TEntity>[]);
      } catch (err) {
        if (gen !== loadGen.current) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (gen === loadGen.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [adapter, chipId, criteria, debouncedSearch, pageSize],
  );

  useEffect(() => {
    if (!adapter) return;
    void loadPage(0, false);
  }, [adapter, loadPage]);

  const permissions = compiled?.resolvePermissions?.() ?? {};
  const chips = adapter?.buildChips().filter((chip) => !chip.hidden) ?? config.list.chips;
  const appliedFilters = adapter
    ? adapter.buildAppliedFilters(criteria, refData, chipId)
    : [];
  const filterCount = adapter ? adapter.countActiveSheetFilters(criteria, chipId) : 0;
  const floatingActions = visibleActions(config.actions?.floating, permissions, chipId, []);
  const bulkActions = visibleActions(
    config.actions?.bulk,
    permissions,
    chipId,
    [...selectedIds],
  );
  const detailFooterActions = visibleActions(
    config.actions?.detailFooter,
    permissions,
    chipId,
    selectedEntity ? [selectedEntity] : [],
    selectedEntity,
  );

  const rowMenuActions = useCallback(
    (row: ListRowItem<TEntity>) =>
      visibleActions(
        config.actions?.rowMenu,
        permissions,
        chipId,
        [entityFromRow(row)].filter(Boolean),
        entityFromRow(row),
      ),
    [chipId, config.actions?.rowMenu, permissions],
  );

  const selectChip = useCallback(
    (nextChip: string) => {
      if (!adapter?.isValidChip(nextChip)) return;
      const nextCriteria = adapter.getDefaultCriteriaForChip(nextChip);
      setChipId(nextChip);
      setCriteria(nextCriteria as TCriteria);
      setItems([]);
    },
    [adapter],
  );

  const openFilter = useCallback(() => {
    if (!adapter) return;
    setFilterForm(adapter.buildFilterFormDefinition(chipId, refData, criteria));
    setFilterValues(adapter.criteriaToFilterFormValues(chipId, criteria));
    setFilterOpen(true);
  }, [adapter, chipId, criteria, refData]);

  const applyFilter = useCallback(
    (values: FormValues) => {
      if (!adapter) return;
      setCriteria(adapter.filterFormValuesToCriteria(chipId, values, criteria) as TCriteria);
      setFilterOpen(false);
    },
    [adapter, chipId, criteria],
  );

  const removeFilter = useCallback(
    (pillId: string) => {
      if (!adapter) return;
      setCriteria(adapter.removeFilterById(criteria, pillId) as TCriteria);
    },
    [adapter, criteria],
  );

  const openDetail = useCallback(
    async (row: ListRowItem<TEntity>) => {
      if (!compiled) return;
      setSelectedRow(row);
      setDetailOpen(true);
      let entity: TEntity | undefined =
        compiled.detail.findInList(items, row.id) ?? entityFromRow(row);
      if (compiled.detail.refreshOnOpen && entity) {
        entity =
          (await firstAsyncValue(compiled.detail.refreshOnOpen(entity))) ?? entity;
      }
      if (!entity && compiled.detail.fetchById) {
        entity = await firstAsyncValue(compiled.detail.fetchById(row.id));
      }
      setSelectedEntity(entity);
      if (entity) {
        setDetailTitle(compiled.detail.getTitle(entity));
        setDetailSections(compiled.detail.buildViewSections(entity, refData));
      }
    },
    [compiled, items, refData],
  );

  const openCreate = useCallback(() => {
    if (!compiled?.create) return;
    const canOpen = compiled.create.canOpen({
      permissions,
      activeChip: chipId,
    });
    if (!canOpen) return;
    compiled.create.onBeforeOpen?.();
    const presets = compiled.create.defaultPresets ?? {};
    setCreateForm(compiled.create.buildCreateForm?.(refData, presets));
    setCreateValues(compiled.create.defaultCreateValues?.(refData, presets) ?? {});
    setCreateOpen(true);
  }, [chipId, compiled, permissions, refData]);

  const submitCreate = useCallback(
    async (values: FormValues) => {
      if (!compiled?.create?.createSave) return;
      const message = compiled.create.validateBeforeCreate?.(values);
      if (message) {
        setError(message);
        return;
      }
      await firstAsyncValue(
        compiled.create.createSave(values, { refData, presets: compiled.create.defaultPresets ?? {} }),
      );
      setCreateOpen(false);
      await loadPage(0, false);
    },
    [compiled, loadPage, refData],
  );

  const runAction = useCallback(
    async (action: ListActionDef, entity?: TEntity) => {
      if (action.run === 'openCreate') {
        openCreate();
        return;
      }
      if (action.run === 'openDetail' || action.run === 'openDetailEdit') {
        const row = items.find((item) => entityFromRow(item) === entity) ?? selectedRow;
        if (row) await openDetail(row);
        return;
      }
      const fn = config.operations?.[action.run];
      if (typeof fn === 'function') {
        await fn(entity ?? selectedEntity, { chipId, criteria, refData });
        await loadPage(0, false);
      }
    },
    [chipId, config.operations, criteria, items, loadPage, openCreate, openDetail, refData, selectedEntity, selectedRow],
  );

  const hasMore = items.length < totalSize;

  return {
    compiled,
    compiling,
    loading,
    loadingMore,
    error,
    title: config.meta.title,
    searchPlaceholder: compiled?.searchPlaceholder ?? config.meta.searchPlaceholder ?? 'Search',
    emptyMessage: compiled?.emptyMessage ?? config.meta.emptyMessage ?? 'No items',
    filterSheetTitle: compiled?.filterSheetTitle ?? config.meta.filterSheetTitle ?? 'Filters',
    chips,
    chipId,
    searchText,
    items,
    totalSize,
    hasMore,
    appliedFilters,
    filterCount,
    permissions,
    selectedIds,
    selectedEntity,
    selectedRow,
    detailOpen,
    filterOpen,
    createOpen,
    detailSections,
    detailTitle,
    filterForm,
    filterValues,
    createForm,
    createValues,
    floatingActions,
    bulkActions,
    rowMenuActions,
    detailFooterActions,
    setSearchText: setSearchTextState,
    selectChip,
    loadMore: () => {
      if (!hasMore || loading || loadingMore) return;
      void loadPage(pageIndex + 1, true);
    },
    reload: () => {
      void loadPage(0, false);
    },
    openDetail,
    closeDetail: () => {
      setDetailOpen(false);
      setSelectedEntity(undefined);
      setSelectedRow(undefined);
    },
    openFilter,
    closeFilter: () => setFilterOpen(false),
    applyFilter,
    removeFilter,
    openCreate,
    closeCreate: () => setCreateOpen(false),
    submitCreate,
    toggleSelected: (id) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    runAction,
  };
}

