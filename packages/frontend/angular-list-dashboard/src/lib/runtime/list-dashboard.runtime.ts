import type { ActivatedRoute, Router } from '@angular/router';
import type {
  FilteredListDashboardConfig,
  ListActionFormConfig,
  ListDashboardConfig,
  ListDashboardOperations,
  ListFilterCriteria,
  ListFormResolverContext,
  ListPreparationTrigger,
  ListRowItem,
  RefDataMap,
} from '@ssdev-toolkit/list-dashboard-core';
import type { FormValues } from '@ssdev-toolkit/forms-core';
import { Subscription, tap } from 'rxjs';
import {
  FilteredListDashboardController,
  type FilteredListDashboardInitHooks,
} from '../filtered-list-dashboard.controller';
import {
  ListActionFormController,
  type ListActionFormSaved,
} from '../list-action-form.controller';
import { ListFormCache } from './list-form-cache.service';
import { ListPreparationService } from './list-preparation.service';

/** Synthetic action-form ids for the detail-edit and bulk-edit stepper flows. */
export const LIST_DETAIL_EDIT_FORM_ID = '__detailEdit';
export const LIST_BULK_EDIT_FORM_ID = '__bulkEdit';

export type ListDashboardNotificationLevel = 'success' | 'error' | 'info';

export interface ListDashboardNotification {
  level: ListDashboardNotificationLevel;
  message: string;
  error?: unknown;
}

export interface ListDashboardRuntimeHooks<TEntity>
  extends FilteredListDashboardInitHooks<TEntity> {
  onCreated?: (result: unknown) => void;
  onCreateError?: (error: unknown) => void;
  onPreparationError?: (
    trigger: ListPreparationTrigger,
    error: unknown,
  ) => void;
  notify?: (notification: ListDashboardNotification) => void;
}

export interface ListDashboardRuntimeInitOptions<
  TEntity,
  TCriteria extends ListFilterCriteria,
  TContext,
  TOperations extends ListDashboardOperations,
> {
  config: ListDashboardConfig<TEntity, TCriteria, TContext, TOperations>;
  formContext: ListFormResolverContext;
  preparationContext: TContext;
  route: ActivatedRoute;
  router: Router;
  refData?: RefDataMap;
  forEventId?: string;
  hooks?: ListDashboardRuntimeHooks<TEntity>;
}

/** Orchestration around ListDashboardConfig and FilteredListDashboardController. */
export class ListDashboardRuntime<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> {
  dashboard = new FilteredListDashboardController<TEntity, TCriteria>();
  /** Sheet state for config-driven action forms and stepper edit flows. */
  readonly actionForm = new ListActionFormController<TEntity>();
  loading = false;
  error: unknown;
  initialized = false;
  destroyed = false;
  createSaving = false;
  /** Custom stepper step data collected during the create flow. */
  createCustomStepData: Record<string, unknown> = {};

  private generation = 0;
  private options?: ListDashboardRuntimeInitOptions<
    TEntity,
    TCriteria,
    TContext,
    TOperations
  >;
  private compiled?: FilteredListDashboardConfig<TEntity, TCriteria>;
  private subscriptions = new Subscription();

  constructor(
    private readonly formCache = new ListFormCache(),
    readonly preparation = new ListPreparationService(),
  ) {}

  get definition(): ListDashboardConfig<TEntity, TCriteria, TContext, TOperations> | undefined {
    return this.options?.config;
  }

  async init(
    options: ListDashboardRuntimeInitOptions<TEntity, TCriteria, TContext, TOperations>,
  ): Promise<void> {
    const run = ++this.generation;
    if (this.initialized) {
      this.dashboard.destroy();
      this.dashboard = new FilteredListDashboardController<TEntity, TCriteria>();
    }
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
    this.options = options;
    this.loading = true;
    this.error = undefined;
    this.initialized = false;
    this.destroyed = false;
    this.preparation.configure(options.config, options.preparationContext);

    try {
      const compiled = await this.formCache.compile(
        options.config,
        options.formContext,
      );
      await this.preparation.prepare('init');
      if (run !== this.generation || this.destroyed) return;

      this.compiled = compiled;
      this.dashboard.init({
        route: options.route,
        router: options.router,
        refData: options.refData ?? {},
        config: compiled,
        hooks: this.buildDashboardHooks(options),
        forEventId: options.forEventId,
      });
      this.installDetailEditPreparation();
      this.initActionForm();
      this.initialized = true;
      this.loading = false;
    } catch (error) {
      if (run !== this.generation || this.destroyed) return;
      this.error = error;
      this.loading = false;
      options.hooks?.notify?.({
        level: 'error',
        message: 'Unable to load this list dashboard.',
        error,
      });
    }
  }

  retry(): Promise<void> {
    if (!this.options) return Promise.resolve();
    this.formCache.invalidate();
    return this.init(this.options);
  }

  setRefData(refData: RefDataMap): void {
    this.options = this.options ? { ...this.options, refData } : this.options;
    if (this.initialized) this.dashboard.setRefData(refData);
  }

  async openDetail(row: ListRowItem<TEntity>, edit = false): Promise<void> {
    const entity = row.payload;
    if (!entity) return;
    this.dashboard.detailPage.openEntity(entity, { edit });
  }

  async openCreate(): Promise<void> {
    if (!(await this.prepare('createOpen'))) return;
    this.syncCreateContextFromPreparation();
    this.dashboard.createPage.openSheet();
  }

  async openBulkEdit(entities: TEntity[]): Promise<boolean> {
    if (!(await this.prepare('bulkEdit'))) return false;
    if (this.hasBulkEditStepper) {
      return this.openBulkEditStepper(entities);
    }
    return this.dashboard.openBulkEdit(entities);
  }

  enterDetailEdit(): void {
    this.dashboard.detailPage.enterEdit();
  }

  /** True when `detail.edit` is configured as a stepper flow. */
  get hasEditStepper(): boolean {
    const edit = this.options?.config.detail.edit;
    return edit?.kind === 'stepper' && !!edit.steps?.length && !!edit.buildStepDefinition;
  }

  /** True when `bulkEdit` is configured as a stepper flow. */
  get hasBulkEditStepper(): boolean {
    const bulkEdit = this.options?.config.bulkEdit;
    return bulkEdit?.kind === 'stepper'
      && !!bulkEdit.steps?.length
      && !!bulkEdit.buildStepDefinition;
  }

  /** Opens `actionForms[actionFormId]` for an entity after its preparation runs. */
  async openActionForm(actionFormId: string, entity?: TEntity): Promise<boolean> {
    const config = this.options?.config.actionForms?.[actionFormId];
    const target = entity ?? this.dashboard.detailPage.selected;
    if (!config || target === undefined) return false;

    const prepared = config.preparationTasks?.length
      ? await this.runPreparationTasks(config.preparationTasks)
      : await this.runPreparation('operation');
    if (!prepared) return false;

    return this.actionForm.openForm(actionFormId, target);
  }

  notify(notification: ListDashboardNotification): void {
    this.options?.hooks?.notify?.(notification);
  }

  prepare(trigger: ListPreparationTrigger): Promise<boolean> {
    return this.runPreparation(trigger);
  }

  runOperationPreparation(): Promise<boolean> {
    return this.runPreparation('operation');
  }

  runAction(
    run: string,
    selection: readonly TEntity[] = [],
    actionFormId?: string,
  ): void {
    if (actionFormId) {
      void this.openActionForm(actionFormId, selection[0]);
      return;
    }
    switch (run) {
      case 'openCreate':
        void this.openCreate();
        return;
      case 'openBulkEdit':
        void this.openBulkEdit([...selection]);
        return;
      case 'enterEdit':
        this.enterDetailEdit();
        return;
      case 'openDetail': {
        const entity = selection[0] ?? this.dashboard.detailPage.selected;
        if (entity) {
          this.dashboard.detailPage.openEntity(entity);
        }
        return;
      }
      case 'openDetailEdit': {
        const entity = selection[0] ?? this.dashboard.detailPage.selected;
        if (entity) {
          this.dashboard.detailPage.openEntity(entity);
          this.enterDetailEdit();
        }
        return;
      }
      default: {
        const operation = this.options?.config.operations?.[run];
        operation?.(selection.length <= 1 ? selection[0] : selection, selection);
      }
    }
  }

  onCreateCustomStepDataChange(change: { stepId: string; data: unknown }): void {
    this.createCustomStepData = {
      ...this.createCustomStepData,
      [change.stepId]: change.data,
    };
  }

  submitCreate(values: FormValues): void {
    const create = this.compiled?.create;
    const validationError = this.dashboard.validateBeforeCreate(values);
    if (validationError) {
      this.options?.hooks?.notify?.({ level: 'error', message: validationError });
      return;
    }
    if (!create?.createSave || this.createSaving) return;

    this.createSaving = true;
    const createContext = {
      ...this.dashboard.getCreateContext(),
      customStepData: this.createCustomStepData,
    };
    this.subscriptions.add(
      create.createSave(values, createContext).subscribe({
        next: result => {
          this.createSaving = false;
          this.createCustomStepData = {};
          this.dashboard.createPage.close();
          this.refreshCreated(result);
          this.options?.hooks?.onCreated?.(result);
          this.options?.hooks?.notify?.({
            level: 'success',
            message: 'Created successfully.',
          });
        },
        error: error => {
          this.createSaving = false;
          this.options?.hooks?.onCreateError?.(error);
          this.options?.hooks?.notify?.({
            level: 'error',
            message: 'Unable to create the item.',
            error,
          });
        },
        // Feature saves may complete empty (e.g. IFSC confirm Cancel via filter, or EMPTY after a handled error).
        complete: () => {
          this.createSaving = false;
        },
      }),
    );
  }

  destroy(): void {
    this.generation += 1;
    this.destroyed = true;
    this.loading = false;
    this.createSaving = false;
    this.actionForm.destroy();
    this.preparation.cancel();
    this.subscriptions.unsubscribe();
    if (this.initialized) this.dashboard.destroy();
    this.initialized = false;
  }

  private mapEntityToListRow(entity: TEntity): ListRowItem | undefined {
    const map = this.options?.config.list.mapToListRow;
    if (!map) return undefined;
    return map(entity, {
      refData: this.options?.refData ?? {},
      context: this.options?.preparationContext as TContext,
    });
  }

  private refreshCreated(result: unknown): void {
    if (!result || typeof result !== 'object') return;
    const row = this.mapEntityToListRow(result as TEntity);
    if (row) this.dashboard.listPage.prependListItem(row);
  }

  private buildDashboardHooks(
    options: ListDashboardRuntimeInitOptions<TEntity, TCriteria, TContext, TOperations>,
  ): FilteredListDashboardInitHooks<TEntity> {
    const hooks = options.hooks;
    return {
      ...hooks,
      mapEntityToListRow: entity =>
        this.mapEntityToListRow(entity)
        ?? hooks?.mapEntityToListRow?.(entity)
        ?? ({ id: String((entity as { id?: unknown }).id ?? ''), title: '' } as ListRowItem),
      onEntityUpdated: entity => {
        const row = this.mapEntityToListRow(entity);
        if (row) this.dashboard.listPage.updateListItem(row);
        hooks?.onEntityUpdated?.(entity);
      },
      onBulkSaved: entities => {
        for (const entity of entities) {
          const row = this.mapEntityToListRow(entity);
          if (row) this.dashboard.listPage.updateListItem(row);
        }
        this.dashboard.listPage.clearSelection();
        hooks?.onBulkSaved?.(entities);
      },
      onFilterOpen: continueOpen => {
        let continued = false;
        const continueOnce = (): void => {
          if (continued) return;
          continued = true;
          continueOpen();
        };

        void this.runPreparation('filterOpen').then(prepared => {
          if (!prepared) return;
          this.syncFilterOptionsFromContext();
          const result = hooks?.onFilterOpen?.(continueOnce);
          if (result !== false) continueOnce();
        });
        return false;
      },
      prepareCreateRouteOpen: async () => {
        const prepared = await this.runPreparation('createOpen');
        if (prepared) this.syncCreateContextFromPreparation();
        return prepared;
      },
    };
  }

  private syncFilterOptionsFromContext(): void {
    const context = this.options?.preparationContext as Record<string, unknown> | undefined;
    const donorOptions = context?.['donorOptions'];
    if (Array.isArray(donorOptions)) {
      this.dashboard.listPageAdapter.setAsyncFilterOptions(
        donorOptions as { key: string; label: string }[],
      );
    }
  }

  private syncCreateContextFromPreparation(): void {
    const context = this.options?.preparationContext as Record<string, unknown> | undefined;
    const createOptions = context?.['createOptions'];
    if (createOptions && typeof createOptions === 'object') {
      Object.assign(this.dashboard.getCreateContext(), createOptions);
    }
  }

  private installDetailEditPreparation(): void {
    const detailPage = this.dashboard.detailPage;
    const enterEdit = detailPage.enterEdit.bind(detailPage);
    detailPage.enterEdit = (): void => {
      void this.runPreparation('editPrepare').then(prepared => {
        if (!prepared) return;
        if (this.hasEditStepper) {
          this.openDetailEditStepper();
          return;
        }
        enterEdit();
      });
    };
  }

  private initActionForm(): void {
    this.actionForm.init({
      resolveConfig: id => this.options?.config.actionForms?.[id],
      refData: () => this.options?.refData ?? {},
      activeChip: () => this.dashboard.listPage.activeChip,
      permissions: () => this.dashboard.permissions,
      preparationContext: () => this.options?.preparationContext,
      setFormValue: this.options?.hooks?.setFormValue,
      onSaved: saved => this.applyActionFormSuccess(saved),
      onError: error => {
        this.options?.hooks?.onSaveError?.(error);
        this.notify({
          level: 'error',
          message: 'Unable to save this action.',
          error,
        });
      },
      onValidationError: message => this.notify({ level: 'error', message }),
    });
  }

  private applyActionFormSuccess(saved: ListActionFormSaved<TEntity>): void {
    const success = saved.config.success ?? {};
    const mode = success.mode ?? 'updateEntity';
    const updated = saved.result && typeof saved.result === 'object'
      ? saved.result as TEntity
      : undefined;

    this.actionForm.close();

    if (mode === 'reloadList') {
      this.dashboard.listPage.reloadList();
    } else if (mode === 'updateEntity' && updated) {
      const row = this.mapEntityToListRow(updated);
      if (row) this.dashboard.listPage.updateListItem(row);
      this.options?.hooks?.onEntityUpdated?.(updated);
    }

    if (success.reopenDetail) {
      const entity = updated ?? saved.entity;
      if (entity !== undefined) this.dashboard.detailPage.openEntity(entity);
    }

    if (success.message) {
      this.notify({ level: 'success', message: success.message });
    }
  }

  private openDetailEditStepper(): boolean {
    const entity = this.dashboard.detailPage.selected;
    const config = this.buildDetailEditActionForm();
    if (!entity || !config) return false;
    return this.actionForm.openWith(LIST_DETAIL_EDIT_FORM_ID, config, entity);
  }

  private openBulkEditStepper(entities: TEntity[]): boolean {
    const bulkEdit = this.options?.config.bulkEdit;
    if (!bulkEdit || !entities.length || !bulkEdit.validateSelection(entities)) return false;
    const config = this.buildBulkEditActionForm(entities);
    if (!config) return false;
    return this.actionForm.openWith(LIST_BULK_EDIT_FORM_ID, config, entities[0]);
  }

  /** Adapts `detail.edit` stepper hooks onto the shared action-form contract. */
  private buildDetailEditActionForm(): ListActionFormConfig<TEntity> | undefined {
    const detail = this.options?.config.detail;
    const edit = detail?.edit;
    if (!detail || !edit?.buildStepDefinition) return undefined;

    const editContext = (entity: TEntity) => ({
      entity,
      refData: this.options?.refData ?? {},
    });

    return {
      kind: 'stepper',
      // Mirrors the in-sheet edit header so both edit flows read the same.
      title: entity => `${detail.getTitle(entity)} — Edit`,
      steps: edit.steps,
      customSteps: edit.customSteps,
      documentTypes: edit.documentTypes,
      buildStepDefinition: (stepId, values, ctx) =>
        edit.buildStepDefinition!(stepId, values, editContext(ctx.entity)),
      resolveSteps: edit.resolveSteps,
      validateStep: (stepId, values, ctx) =>
        edit.validateStep?.(stepId, values, editContext(ctx.entity)),
      defaultValues: entity => edit.entityToEditValues(entity),
      validateBeforeSave: ctx => edit.validateBeforeSave?.({
        entity: ctx.entity,
        refData: ctx.refData,
        values: ctx.values,
        documents: ctx.documents,
        existingDocumentCount: 0,
        customStepData: ctx.customStepData,
      }),
      save: ctx => edit.save({
        entity: ctx.entity,
        refData: ctx.refData,
        values: ctx.values,
        documents: ctx.documents,
        existingDocumentCount: 0,
        customStepData: ctx.customStepData,
      }),
      success: { mode: 'updateEntity', reopenDetail: true },
    };
  }

  /** Adapts `bulkEdit` stepper hooks onto the shared action-form contract. */
  private buildBulkEditActionForm(
    entities: TEntity[],
  ): ListActionFormConfig<TEntity> | undefined {
    const bulkEdit = this.options?.config.bulkEdit;
    if (!bulkEdit?.buildStepDefinition) return undefined;

    const bulkContext = (template: TEntity) => ({
      template,
      entities,
      refData: this.options?.refData ?? {},
    });

    return {
      kind: 'stepper',
      title: () => bulkEdit.title ?? 'Bulk Update',
      steps: bulkEdit.steps,
      customSteps: bulkEdit.customSteps,
      documentTypes: bulkEdit.documentTypes,
      buildStepDefinition: (stepId, values, ctx) =>
        bulkEdit.buildStepDefinition!(stepId, values, bulkContext(ctx.entity)),
      resolveSteps: bulkEdit.resolveSteps,
      validateStep: (stepId, values, ctx) =>
        bulkEdit.validateStep?.(stepId, values, bulkContext(ctx.entity)),
      defaultValues: entity => bulkEdit.entityToEditValues(entity),
      validateBeforeSave: ctx =>
        bulkEdit.validateBeforeSave?.(ctx.entity, ctx.values, ctx.documents, ctx.refData),
      save: ctx => bulkEdit.save(entities, ctx.values, ctx.documents, ctx.customStepData).pipe(
        tap((updatedEntities: TEntity[]) => {
          for (const entity of updatedEntities) {
            const row = this.mapEntityToListRow(entity);
            if (row) this.dashboard.listPage.updateListItem(row);
          }
          this.dashboard.listPage.clearSelection();
          this.options?.hooks?.onBulkSaved?.(updatedEntities);
        }),
      ),
      success: { mode: 'none' },
    };
  }

  private async runPreparationTasks(taskIds: readonly string[]): Promise<boolean> {
    try {
      await this.preparation.prepareTasks(taskIds);
      return !this.destroyed;
    } catch (error) {
      if (this.destroyed) return false;
      this.options?.hooks?.onPreparationError?.('operation', error);
      this.notify({
        level: 'error',
        message: 'Unable to prepare this action.',
        error,
      });
      return false;
    }
  }

  private async runPreparation(trigger: ListPreparationTrigger): Promise<boolean> {
    try {
      await this.preparation.prepare(trigger);
      return !this.destroyed;
    } catch (error) {
      if (this.destroyed) return false;
      this.options?.hooks?.onPreparationError?.(trigger, error);
      this.options?.hooks?.notify?.({
        level: 'error',
        message: `Unable to prepare ${trigger}.`,
        error,
      });
      return false;
    }
  }
}
