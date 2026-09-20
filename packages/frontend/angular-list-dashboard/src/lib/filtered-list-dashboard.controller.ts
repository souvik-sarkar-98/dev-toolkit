import { ActivatedRoute, Router } from '@angular/router';
import { RefDataMap } from '@ssdev-toolkit/list-dashboard-core';
import { ListFilterCriteria } from '@ssdev-toolkit/list-dashboard-core';
import { createListPageAdapter } from '@ssdev-toolkit/list-dashboard-core';
import { createDetailPageAdapter } from '@ssdev-toolkit/list-dashboard-core';
import { FilteredListPageController } from './filtered-list-page.controller';
import { ListDetailPageController } from './list-detail-page.controller';
import { ListCreatePageController } from './list-create-page.controller';
import { ListRouteSync } from './list-route-sync';
import { BulkEditPageController } from './bulk-edit-page.controller';
import type { FieldOption, FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { CfFormStepperStep } from '@ssdev-toolkit/angular-forms';
import {
  FilteredListCreateContext,
  FilteredListDashboardAdapters,
  FilteredListDashboardConfig,
  FilteredListDashboardContext,
  FilteredListDashboardPermissions,
} from '@ssdev-toolkit/list-dashboard-core';
import { ConfiguredListPageAdapter } from '@ssdev-toolkit/list-dashboard-core';
import { ListRowItem } from '@ssdev-toolkit/list-dashboard-core';

export interface FilteredListDashboardInitHooks<TEntity> {
  onSaveError?: (error: unknown) => void;
  setFormValue?: (key: string, value: unknown) => void;
  onEntityUpdated?: (entity: TEntity) => void;
  onBulkSaved?: (entities: TEntity[]) => void;
  onBulkSaveError?: (error: unknown) => void;
  mapEntityToListRow?: (entity: TEntity) => ListRowItem;
  /** Prefetch async filter options before the filter sheet opens. */
  onFilterOpen?: (continueOpen: () => void) => void | false;
  /** Prepare async create data before a route deep link opens create mode. */
  prepareCreateRouteOpen?: () => boolean | Promise<boolean>;
}

export interface FilteredListDashboardInitOptions<
  TEntity,
  TCriteria extends ListFilterCriteria,
> {
  route: ActivatedRoute;
  router: Router;
  refData: RefDataMap;
  config: FilteredListDashboardConfig<TEntity, TCriteria>;
  hooks?: FilteredListDashboardInitHooks<TEntity>;
  forEventId?: string;
}

/**
 * Wires list, detail, create, and optional bulk-edit controllers from a single dashboard config.
 */
export class FilteredListDashboardController<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
> {
  readonly listPage = new FilteredListPageController<TCriteria>();
  readonly detailPage = new ListDetailPageController<TEntity>();
  readonly createPage = new ListCreatePageController();
  readonly bulkEditPage = new BulkEditPageController<TEntity>();

  permissions: FilteredListDashboardPermissions = {};
  listPageAdapter!: ConfiguredListPageAdapter<TCriteria>;

  private listRouteSync!: ListRouteSync;
  private adapters!: FilteredListDashboardAdapters<TEntity, TCriteria>;
  private config?: FilteredListDashboardConfig<TEntity, TCriteria>;
  private refData: RefDataMap = {};
  private route!: ActivatedRoute;

  get detailPageAdapter() {
    return this.adapters.detailPageAdapter;
  }

  init(options: FilteredListDashboardInitOptions<TEntity, TCriteria>): void {
    this.config = options.config;
    this.refData = options.refData;
    this.route = options.route;
    this.permissions = options.config.resolvePermissions?.() ?? {};

    this.listPageAdapter = createListPageAdapter(options.config.list);
    this.adapters = {
      listPageAdapter: this.listPageAdapter,
      detailPageAdapter: createDetailPageAdapter(options.config.detail),
    };

    this.listRouteSync = new ListRouteSync(
      options.router,
      options.route,
      options.config.list.route.chipConfig,
      options.config.list.route.filterBindings,
    );

    this.listPageAdapter.configure({
      forEventId: options.forEventId,
      listRouteSync: this.listRouteSync,
    });

    this.detailPageAdapter.configure({
      activeChip: () => this.listPage.activeChip,
      canUpdate: () => this.resolveCanUpdateEntity(),
    });

    const detailRouteSync = options.config.detailRouteSync ?? {
      idParam: 'id',
    };

    this.detailPage.init({
      adapter: this.detailPageAdapter,
      route: options.route,
      router: options.router,
      routeSyncConfig: detailRouteSync,
      refData: this.refData,
      getListItems: () => this.listPage.listItems,
      onEntityUpdated: entity => {
        options.hooks?.onEntityUpdated?.(entity);
        if (options.hooks?.mapEntityToListRow) {
          this.listPage.updateListItem(options.hooks.mapEntityToListRow(entity));
        }
      },
      onSaveError: options.hooks?.onSaveError,
      setFormValue: options.hooks?.setFormValue,
    });

    if (options.config.create) {
      const createConfig = options.config.create;
      this.createPage.init({
        route: options.route,
        router: options.router,
        config: createConfig.route,
        canOpen: () => createConfig.canOpen(this.buildContext()),
        prepareRouteOpen: options.hooks?.prepareCreateRouteOpen,
        onBeforeOpen: createConfig.onBeforeOpen,
        extraPresetReaders: createConfig.extraPresetReaders,
      });

      if (createConfig.defaultPresets) {
        this.createPage.presets = {
          ...this.createPage.presets,
          ...createConfig.defaultPresets,
        };
      }
    }

    if (options.config.bulkEdit) {
      this.bulkEditPage.init({
        config: options.config.bulkEdit,
        refData: this.refData,
        onSaved: entities => options.hooks?.onBulkSaved?.(entities),
        onSaveError: options.hooks?.onBulkSaveError,
        setFormValue: options.hooks?.setFormValue,
      });
    }

    this.listPage.init({
      adapter: this.listPageAdapter,
      route: options.route,
      router: options.router,
      listRouteSync: this.listRouteSync,
      refData: this.refData,
      onBeforeRouteStateApply: () => {
        if (this.detailPage.open) {
          this.detailPage.close();
        }
      },
      onAfterListLoaded: () => {
        this.detailPage.tryOpenPending();
        this.createPage.tryOpenPending();
      },
      onFilterOpen: options.hooks?.onFilterOpen,
    });

    for (const loader of options.config.refDataLoaders ?? []) {
      loader.ensure().subscribe(() => {
        loader.apply?.();
        this.listPage.setRefData(this.refData);
        this.detailPage.setRefData(this.refData);
        this.bulkEditPage.setRefData(this.refData);
      });
    }
  }

  destroy(): void {
    this.listPage.destroy();
    this.detailPage.destroy();
    this.createPage.destroy();
    this.bulkEditPage.destroy();
  }

  buildContext(): FilteredListDashboardContext {
    return {
      permissions: this.permissions,
      activeChip: this.listPage.activeChip,
    };
  }

  isListSelectable(): boolean {
    return this.config?.selectableWhen?.(this.buildContext()) ?? false;
  }

  /** FAB visibility and create-sheet eligibility — delegates to {@link FilteredListCreateConfig.canOpen}. */
  get showCreateFab(): boolean {
    return !!this.config?.create?.canOpen(this.buildContext());
  }

  openBulkEdit(entities: TEntity[]): boolean {
    return this.bulkEditPage.openBulkEdit(entities);
  }

  setRefData(refData: RefDataMap): void {
    this.refData = refData;
    this.createInitialValuesCache = null;
    this.createInitialValuesPresetsRef = null;
    this.listPage.setRefData(refData);
    this.detailPage.setRefData(refData);
    this.bulkEditPage.setRefData(refData);
  }

  get searchPlaceholder(): string {
    return this.config?.searchPlaceholder ?? 'Search by ID';
  }

  get filterSheetTitle(): string {
    return this.config?.filterSheetTitle ?? 'Filters';
  }

  get emptyMessage(): string {
    return this.config?.emptyMessage ?? 'No items match this filter.';
  }

  get hasCreateForm(): boolean {
    const create = this.config?.create;
    if (!create?.buildCreateForm) {
      return false;
    }
    const kind = create.kind ?? 'form';
    return kind === 'form';
  }

  get createDefinition(): FormDefinition | undefined {
    const build = this.config?.create?.buildCreateForm;
    if (!build) {
      return undefined;
    }
    return build(this.refData, this.createPage.presets);
  }

  get createInitialValues(): FormValues {
    const defaults = this.config?.create?.defaultCreateValues;
    if (!defaults) {
      return this.emptyCreateValues;
    }
    if (
      this.createInitialValuesCache
      && this.createInitialValuesPresetsRef === this.createPage.presets
    ) {
      return this.createInitialValuesCache;
    }
    this.createInitialValuesPresetsRef = this.createPage.presets;
    this.createInitialValuesCache = defaults(this.refData, this.createPage.presets);
    return this.createInitialValuesCache;
  }

  validateBeforeCreate(values: FormValues): string | undefined {
    return this.config?.create?.validateBeforeCreate?.(values);
  }

  private createContextExtras: Partial<FilteredListCreateContext> = {};
  private createInitialValuesCache: FormValues | null = null;
  private createInitialValuesPresetsRef: Record<string, unknown> | null = null;
  private readonly emptyCreateValues: FormValues = {};

  setCreateContextExtras(extras: Partial<FilteredListCreateContext>): void {
    this.createContextExtras = extras;
  }

  getCreateContext(): FilteredListCreateContext {
    return {
      refData: this.refData,
      presets: this.createPage.presets,
      ...this.createContextExtras,
    };
  }

  get hasCreateStepper(): boolean {
    const create = this.config?.create;
    return create?.kind === 'stepper'
      && !!create.steps?.length
      && !!create.buildStepDefinition;
  }

  get createSteps(): CfFormStepperStep[] {
    return this.config?.create?.steps ?? [];
  }

  buildCreateStepDefinition = (stepId: string, values: FormValues): FormDefinition => {
    const build = this.config?.create?.buildStepDefinition;
    if (!build) {
      return { id: '', key: '', label: '', description: null, fields: [] };
    }
    return build(stepId, values, this.getCreateContext());
  };

  resolveCreateSteps = (values: FormValues): string[] => {
    const resolved = this.config?.create?.resolveSteps?.(values);
    if (resolved) {
      return resolved;
    }
    return this.createSteps.map(step => step.id);
  };

  validateCreateStep = (stepId: string, values: FormValues): string | undefined =>
    this.config?.create?.validateStep?.(stepId, values, this.getCreateContext());

  prepareCreateStep = (stepId: string, values: FormValues): Promise<void> | void =>
    this.config?.create?.prepareStep?.(stepId, values, this.getCreateContext());

  private resolveCanUpdateEntity(): boolean {
    if (this.config?.canUpdateEntity) {
      return this.config.canUpdateEntity(this.buildContext());
    }
    return !!this.permissions['canUpdateEntity'];
  }
}
