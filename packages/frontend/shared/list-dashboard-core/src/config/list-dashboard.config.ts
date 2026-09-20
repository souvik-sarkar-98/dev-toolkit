import type { FormDefinition } from '@ssdev-toolkit/forms-core';
import type {
  BulkEditPageConfig,
  FilteredListCreateConfig,
  FilteredListDashboardContext,
  FilteredListDashboardPermissions,
  FilteredListRefDataLoader,
} from './filtered-list-dashboard.config.js';
import type { FilteredListPageConfig } from './filtered-list-page.config.js';
import type { ListDetailPageConfig } from './list-detail-page.config.js';
import type { ListActionFormConfig } from './list-form-flow.config.js';
import type { ListFilterCriteria, ListRowItem } from '../models/infinite-list.model.js';
import type { RefDataMap } from '../types/ref-data.js';
import type { ListFormSource, ResolvedListForm } from '../runtime/list-form.runtime.js';
import type {
  ListPreparationTask,
  ListPreparationTrigger,
} from '../runtime/list-preparation.runtime.js';

export type ListDashboardHook = (...args: any[]) => unknown;

/** Named, directly callable domain operations. */
export type ListDashboardOperations = Record<string, ListDashboardHook>;

export interface ListDashboardMeta {
  id: string;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  filterSheetTitle?: string;
  emptyMessage?: string;
  detailRouteSync?: { idParam: string; idParamAliases?: string[] };
  pageName?: string;
}

export interface ListDashboardPermissionDefinition {
  resolve?: () => FilteredListDashboardPermissions;
}

export interface ListFormBinding {
  source: string;
  /** Applied after source resolution, before the dashboard receives the form. */
  transform?: (definition: FormDefinition) => FormDefinition;
}

export interface ListDashboardCreateConfig extends FilteredListCreateConfig {
  form?: ListFormBinding;
}

export interface ListDashboardDetailConfig<TEntity> extends ListDetailPageConfig<TEntity> {
  editForm?: ListFormBinding;
}

export interface ListDashboardBulkEditConfig<TEntity> extends BulkEditPageConfig<TEntity> {
  form?: ListFormBinding;
}

export interface ListDashboardPreparationDefinition<TContext = unknown> {
  tasks: ListPreparationTask<TContext>[];
  triggers?: Partial<Record<ListPreparationTrigger, string[]>>;
}

export interface ListDashboardBehaviorDefinition {
  selectableWhen?: (context: FilteredListDashboardContext) => boolean;
  canUpdateEntity?: (context: FilteredListDashboardContext) => boolean;
  refDataLoaders?: FilteredListRefDataLoader[];
}

export type ListActionRunTarget =
  | 'openCreate'
  | 'openBulkEdit'
  | 'enterEdit'
  /** Opens the detail sheet already in edit mode; usable from row actions. */
  | 'openDetailEdit'
  | 'openDetail'
  | (string & {});

export interface ListActionDef {
  id: string;
  label: string;
  appearance?: 'primary' | 'secondary' | 'fab';
  /**
   * Material icon ligature. Rendered for `fab` appearance (default: `add`) and
   * as the leading icon of a `rowMenu` entry.
   */
  icon?: string;
  when?: (
    context: FilteredListDashboardContext & { selection: unknown[]; entity?: unknown },
  ) => boolean;
  /** Built-in target or operations key. */
  run: ListActionRunTarget;
  /** Opens {@link ListDashboardConfig.actionForms} entry instead of an operation. */
  actionFormId?: string;
}

export interface ListDashboardActionsDefinition {
  bulk?: ListActionDef[];
  detailFooter?: ListActionDef[];
  floating?: ListActionDef[];
  /**
   * Overflow ("kebab") menu rendered at the end of every list row. `when`
   * receives that row's entity, and `run` is invoked with it as the selection.
   */
  rowMenu?: ListActionDef[];
  /**
   * Overflow ("kebab") menu in the detail sheet header. `when` receives the
   * selected entity; use for secondary detail actions so the footer can keep
   * a single primary button (e.g. Edit).
   */
  detailMenu?: ListActionDef[];
}

/** Unified consumer-facing list dashboard config. */
export interface ListDashboardConfig<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  list: FilteredListPageConfig<TCriteria> & {
    mapToListRow?: (
      entity: TEntity,
      ctx: { refData: RefDataMap; context: TContext },
    ) => ListRowItem<TEntity>;
  };
  detail: ListDashboardDetailConfig<TEntity>;
  create?: ListDashboardCreateConfig;
  bulkEdit?: ListDashboardBulkEditConfig<TEntity>;
  /** Config-driven detail/bulk/floating action forms (form or stepper). */
  actionForms?: Record<string, ListActionFormConfig<TEntity>>;
  operations?: TOperations;
  meta: ListDashboardMeta;
  permissions?: ListDashboardPermissionDefinition;
  behavior?: ListDashboardBehaviorDefinition;
  forms?: Record<string, ListFormSource>;
  preparation?: ListDashboardPreparationDefinition<TContext>;
  actions?: ListDashboardActionsDefinition;
}

export interface ResolvedListDashboardConfig<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  definition: ListDashboardConfig<TEntity, TCriteria, TContext, TOperations>;
  forms: Readonly<Record<string, ResolvedListForm>>;
}
