import type { Observable } from 'rxjs';
import type { FieldOption, FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { RefDataMap } from '../types/ref-data.js';
import type { ListFilterCriteria } from '../models/infinite-list.model.js';
import type { ListFileUpload } from '../types/uploads.js';
import type { ListDetailField } from '../models/list-detail.model.js';
import type { FilteredListPageConfig } from './filtered-list-page.config.js';
import type { ListDetailPageConfig } from './list-detail-page.config.js';
import type { ConfiguredListPageAdapter } from './filtered-list-page.config.js';
import type { ConfiguredDetailPageAdapter } from './list-detail-page.config.js';
import type { QueryParamMapLike, RouteSnapshotLike } from '../types/route.js';
import type {
  ListFormFlowKind,
  ListFormStepperHooks,
  ListFormStepperResolveSteps,
  ListFormStepperStep,
} from './list-form-flow.config.js';

export type {
  ListFormFlowKind,
  ListFormStepperStep,
  ListFormStepperResolveSteps,
} from './list-form-flow.config.js';

/** @deprecated Use {@link ListFormFlowKind}; `component` remains for legacy create hosts. */
export type FilteredListCreateKind = ListFormFlowKind | 'component';

/** @deprecated Use {@link ListFormStepperStep}. */
export type ListCreateStepperStep<T extends string = string> = ListFormStepperStep<T>;

/** @deprecated Use {@link ListFormStepperResolveSteps}. */
export type ListCreateStepperResolveSteps<T extends string = string> =
  ListFormStepperResolveSteps<T>;

export interface FilteredListDashboardPermissions {
  [key: string]: boolean | undefined;
  showCreateFab?: boolean;
  /** Generic update permission — set by entity {@link resolvePermissions} hooks. */
  canUpdateEntity?: boolean;
}

export interface FilteredListDashboardContext {
  permissions: FilteredListDashboardPermissions;
  activeChip: string;
}

export interface FilteredListCreateContext {
  refData: RefDataMap;
  presets: Record<string, unknown>;
  memberOptions?: FieldOption[];
  eventOptions?: FieldOption[];
  [key: string]: unknown;
}

export type ListCreateRoutePresetType = 'string' | 'boolean';

/** Maps URL query params to create-flow preset state on the dashboard. */
export interface ListCreateRoutePresetBinding {
  param: string;
  stateKey: string;
  type: ListCreateRoutePresetType;
}

/** Create-route sync config — param names for `?create=true` deep links. */
export interface ListCreateRouteSyncConfig {
  /** Query param that opens create mode. Defaults to `create`. */
  actionParam?: string;
  presets?: ListCreateRoutePresetBinding[];
}

export interface FilteredListCreateConfig
  extends ListFormStepperHooks<FilteredListCreateContext> {
  route: ListCreateRouteSyncConfig;
  canOpen: (ctx: FilteredListDashboardContext) => boolean;
  /**
   * Create UI tier — defaults to `form` when {@link buildCreateForm} is set, otherwise `component`.
   * Long creates stay on dedicated stepper sheets until migrated to `stepper`.
   */
  kind?: FilteredListCreateKind;
  extraPresetReaders?: Array<(params: QueryParamMapLike, presets: Record<string, unknown>) => void>;
  onBeforeOpen?: () => void;
  defaultPresets?: Record<string, unknown>;
  /** Build cf-form definition for list create sheet (`kind: 'form'`). */
  buildCreateForm?: (
    refData: RefDataMap,
    presets: Record<string, unknown>,
  ) => FormDefinition;
  defaultCreateValues?: (
    refData: RefDataMap,
    presets: Record<string, unknown>,
  ) => FormValues;
  /** Label for the create form's primary action (defaults to `Create`). */
  saveLabel?: string;
  /** Receives live create-form changes, useful for dependent reference data. */
  onValuesChange?: (values: FormValues, ctx: FilteredListCreateContext) => void;
  validateBeforeCreate?: (values: FormValues) => string | undefined;
  createSave?: (values: FormValues, ctx?: FilteredListCreateContext) => Observable<unknown>;
}

export interface BulkEditPageConfig<TEntity>
  extends ListFormStepperHooks<{
    template: TEntity;
    entities: TEntity[];
    refData: RefDataMap;
  }> {
  when: (ctx: FilteredListDashboardContext) => boolean;
  validateSelection: (entities: TEntity[]) => boolean;
  /** Defaults to `form`. */
  kind?: ListFormFlowKind;
  buildEditSummary: (
    entities: TEntity[],
    refData: RefDataMap,
  ) => ListDetailField[];
  buildEditForm: (
    template: TEntity,
    refData: RefDataMap,
    payableAccountOptions: { key: string; label: string }[],
  ) => FormDefinition;
  entityToEditValues: (entity: TEntity) => FormValues;
  refreshEditForm?: (
    template: TEntity,
    refData: RefDataMap,
    payableAccountOptions: { key: string; label: string }[],
  ) => FormDefinition;
  prepareEdit?: (onReady: (payableAccountOptions: { key: string; label: string }[]) => void) => void;
  onEditValuesChange?: (
    template: TEntity,
    values: FormValues,
    setFormValue?: (key: string, value: unknown) => void,
    refData?: RefDataMap,
  ) => {
    showDocumentUpload?: boolean;
    documentError?: string;
    clearDocuments?: boolean;
  } | void;
  validateBeforeSave?: (
    template: TEntity,
    values: FormValues,
    documents: ListFileUpload[],
    refData?: RefDataMap,
  ) => string | undefined;
  save: (
    entities: TEntity[],
    values: FormValues,
    documents: ListFileUpload[],
    /** Data collected by custom stepper steps (`kind: 'stepper'` only). */
    customStepData?: Record<string, unknown>,
  ) => Observable<TEntity[]>;
  lockedFields?: string[];
  documentTypes?: string[];
  title?: string;
}

export interface FilteredListRefDataLoader {
  ensure: () => Observable<unknown>;
  apply?: () => void;
}

export interface FilteredListDashboardConfig<
  TEntity,
  TCriteria extends ListFilterCriteria,
> {
  list: FilteredListPageConfig<TCriteria>;
  detail: ListDetailPageConfig<TEntity>;
  create?: FilteredListCreateConfig;
  bulkEdit?: BulkEditPageConfig<TEntity>;
  resolvePermissions?: () => FilteredListDashboardPermissions;
  refDataLoaders?: FilteredListRefDataLoader[];
  searchPlaceholder?: string;
  filterSheetTitle?: string;
  emptyMessage?: string;
  selectableWhen?: (ctx: FilteredListDashboardContext) => boolean;
  /** Optional override for detail edit eligibility; defaults to {@link canUpdateEntity} permission. */
  canUpdateEntity?: (ctx: FilteredListDashboardContext) => boolean;
  detailRouteSync?: { idParam: string; idParamAliases?: string[] };
  pageName?: string | ((route: RouteSnapshotLike) => string);
  projectBackLink?: (route: RouteSnapshotLike) => string | undefined;
}

export interface FilteredListDashboardAdapters<
  TEntity,
  TCriteria extends ListFilterCriteria,
> {
  listPageAdapter: ConfiguredListPageAdapter<TCriteria>;
  detailPageAdapter: ConfiguredDetailPageAdapter<TEntity>;
}
