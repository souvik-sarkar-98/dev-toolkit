import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { CustomFormClassNames, CustomFormComponents } from '@ssdev-toolkit/react-forms';
import type {
  AppliedListFilter,
  ChipFilter,
  FilteredListDashboardConfig,
  FilteredListDashboardPermissions,
  ListActionDef,
  ListDashboardConfig,
  ListDetailSection,
  ListFilterCriteria,
  ListFormContext,
  ListRowItem,
  RefDataMap,
} from '@ssdev-toolkit/list-dashboard-core';
import type { IListRouteSync } from '@ssdev-toolkit/list-dashboard-core';

export interface ListDashboardClassNames {
  root?: string;
  toolbar?: string;
  search?: string;
  chips?: string;
  chip?: string;
  chipActive?: string;
  pills?: string;
  pill?: string;
  list?: string;
  row?: string;
  rowSelected?: string;
  empty?: string;
  error?: string;
  panel?: string;
  panelBackdrop?: string;
  fab?: string;
}

export interface UseListDashboardOptions<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext = unknown,
> {
  config: ListDashboardConfig<TEntity, TCriteria, TContext>;
  refData?: RefDataMap;
  forEventId?: string;
  formContext?: ListFormContext<TEntity>;
  listRouteSync?: IListRouteSync;
}

export interface ListDashboardViewState<TEntity, TCriteria extends ListFilterCriteria> {
  compiled: FilteredListDashboardConfig<TEntity, TCriteria> | undefined;
  compiling: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | undefined;
  title: string | undefined;
  searchPlaceholder: string;
  emptyMessage: string;
  filterSheetTitle: string;
  chips: ChipFilter[];
  chipId: string;
  searchText: string;
  items: ListRowItem<TEntity>[];
  totalSize: number;
  hasMore: boolean;
  appliedFilters: AppliedListFilter[];
  filterCount: number;
  permissions: FilteredListDashboardPermissions;
  selectedIds: Set<string>;
  selectedEntity: TEntity | undefined;
  selectedRow: ListRowItem<TEntity> | undefined;
  detailOpen: boolean;
  filterOpen: boolean;
  createOpen: boolean;
  detailSections: ListDetailSection[];
  detailTitle: string | undefined;
  filterForm: FormDefinition | undefined;
  filterValues: FormValues;
  createForm: FormDefinition | undefined;
  createValues: FormValues;
  floatingActions: ListActionDef[];
  bulkActions: ListActionDef[];
  rowMenuActions: (row: ListRowItem<TEntity>) => ListActionDef[];
  detailFooterActions: ListActionDef[];
}

export interface ListDashboardController<TEntity, TCriteria extends ListFilterCriteria>
  extends ListDashboardViewState<TEntity, TCriteria> {
  setSearchText: (value: string) => void;
  selectChip: (chipId: string) => void;
  loadMore: () => void;
  reload: () => void;
  openDetail: (row: ListRowItem<TEntity>) => void;
  closeDetail: () => void;
  openFilter: () => void;
  closeFilter: () => void;
  applyFilter: (values: FormValues) => void;
  removeFilter: (pillId: string) => void;
  openCreate: () => void;
  closeCreate: () => void;
  submitCreate: (values: FormValues) => Promise<void>;
  toggleSelected: (id: string) => void;
  runAction: (action: ListActionDef, entity?: TEntity) => Promise<void>;
}

export interface ListDashboardProps<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext = unknown,
> extends UseListDashboardOptions<TEntity, TCriteria, TContext> {
  classNames?: ListDashboardClassNames;
  formClassNames?: CustomFormClassNames;
  formComponents?: CustomFormComponents;
}
