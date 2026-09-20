import { CommonModule } from '@angular/common';
import {
  Component,
  ContentChild,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  Type,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import type {
  ListActionDef,
  ListDashboardConfig,
  ListDashboardOperations,
  ListFilterCriteria,
  ListFormResolverContext,
  ListRowItem,
  RefDataMap,
} from '@ssdev-toolkit/list-dashboard-core';
import type { FormEngineOptions, FormValues } from '@ssdev-toolkit/forms-core';
import { UniversalListDashboardModule } from '../../universal-list-dashboard.module';
import {
  ListDashboardRuntime,
  type ListDashboardNotification,
  type ListDashboardRuntimeHooks,
} from '../../runtime/list-dashboard.runtime';
import {
  ListBulkActionsDirective,
  ListDetailFooterActionsDirective,
  ListDetailHeroDirective,
  ListDetailViewExtrasDirective,
  ListFloatingActionsDirective,
  ListOverlayDirective,
  ListRowTemplateDirective,
} from '../../runtime/list-dashboard-templates';
import { ListFormCache } from '../../runtime/list-form-cache.service';
import { ListPreparationService } from '../../runtime/list-preparation.service';
import {
  toListRowLinkEvent,
  type ListRowLinkEvent,
} from '../../runtime/list-row-link';
import { ULD_FILE_UPLOAD, type UldFileUploadComponent } from '../../tokens';

@Component({
  selector: 'na-list-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    UniversalListDashboardModule,
  ],
  providers: [
    ListFormCache,
    ListPreparationService,
  ],
  templateUrl: './list-dashboard.component.html',
  styleUrls: ['./list-dashboard.component.scss'],
})
export class ListDashboardComponent<
  TEntity,
  TCriteria extends ListFilterCriteria = ListFilterCriteria,
  TContext = unknown,
  TOperations extends ListDashboardOperations = ListDashboardOperations,
> implements OnChanges, OnDestroy {
  @Input({ required: true })
  config!: ListDashboardConfig<TEntity, TCriteria, TContext, TOperations>;
  @Input() refData: RefDataMap = {};
  @Input() routeContext?: TContext;
  @Input() formContext?: ListFormResolverContext;
  @Input() forEventId?: string;
  @Input() hooks?: ListDashboardRuntimeHooks<TEntity>;
  @Input() documentUploadHint = 'Upload a supporting image or PDF';
  /** Engine options (e.g. phone country codes) applied to create, edit and bulk-edit forms. */
  @Input() formEngineOptions?: FormEngineOptions;

  @Output() rowUpdate = new EventEmitter<TEntity>();
  @Output() rowLinkClick = new EventEmitter<ListRowLinkEvent<TEntity>>();
  @Output() createComplete = new EventEmitter<unknown>();
  @Output() saveError = new EventEmitter<unknown>();
  @Output() notification = new EventEmitter<ListDashboardNotification>();

  @ContentChild(ListRowTemplateDirective)
  customRowTemplate?: ListRowTemplateDirective<TEntity>;
  @ContentChild(ListFloatingActionsDirective)
  floatingActions?: ListFloatingActionsDirective<TEntity, TCriteria, TContext, TOperations>;
  @ContentChild(ListBulkActionsDirective)
  bulkActions?: ListBulkActionsDirective<TEntity, TCriteria, TContext, TOperations>;
  @ContentChild(ListDetailFooterActionsDirective)
  detailFooterActions?: ListDetailFooterActionsDirective<TEntity, TCriteria, TContext, TOperations>;
  @ContentChild(ListDetailHeroDirective)
  detailHero?: ListDetailHeroDirective<TEntity, TCriteria, TContext, TOperations>;
  @ContentChild(ListDetailViewExtrasDirective)
  detailViewExtras?: ListDetailViewExtrasDirective<TEntity, TCriteria, TContext, TOperations>;
  @ContentChild(ListOverlayDirective)
  overlay?: ListOverlayDirective<TEntity, TCriteria, TContext, TOperations>;

  readonly controller: ListDashboardRuntime<TEntity, TCriteria, TContext, TOperations>;
  readonly fileUploadMaxSize = 2 * 1024 * 1024;

  constructor(
    route: ActivatedRoute,
    router: Router,
    cache: ListFormCache,
    preparation: ListPreparationService,
    @Inject(ULD_FILE_UPLOAD) readonly fileUploadComponent: Type<UldFileUploadComponent>,
  ) {
    this.route = route;
    this.router = router;
    this.controller = new ListDashboardRuntime(cache, preparation);
  }

  private readonly route: ActivatedRoute;
  private readonly router: Router;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.config) return;
    if ('refData' in changes && this.controller.initialized
      && !('config' in changes) && !('routeContext' in changes)
      && !('formContext' in changes) && !('forEventId' in changes)) {
      this.controller.setRefData(this.refData);
      return;
    }

    void this.controller.init({
      config: this.config,
      route: this.route,
      router: this.router,
      refData: this.refData,
      forEventId: this.forEventId,
      preparationContext: this.routeContext as TContext,
      formContext: this.formContext ?? {
        dashboardId: this.config.meta.id,
        data: this.asFormData(this.routeContext),
      },
      hooks: {
        ...this.hooks,
        onEntityUpdated: entity => {
          this.hooks?.onEntityUpdated?.(entity);
          this.rowUpdate.emit(entity);
        },
        onSaveError: error => {
          this.hooks?.onSaveError?.(error);
          this.saveError.emit(error);
        },
        onBulkSaveError: error => {
          this.hooks?.onBulkSaveError?.(error);
          this.saveError.emit(error);
        },
        onCreated: result => {
          this.hooks?.onCreated?.(result);
          this.createComplete.emit(result);
        },
        onCreateError: error => {
          this.hooks?.onCreateError?.(error);
          this.saveError.emit(error);
        },
        notify: value => {
          this.hooks?.notify?.(value);
          this.notification.emit(value);
        },
      },
    });
  }

  ngOnDestroy(): void {
    this.controller.destroy();
  }

  get selectedEntities(): TEntity[] {
    const selected = this.controller.dashboard.listPage.selectedIds;
    return this.controller.dashboard.listPage.listItems
      .filter(item => selected.includes(item.id))
      .map(item => item.payload as TEntity)
      .filter((entity): entity is TEntity => entity !== undefined);
  }

  get visibleBulkActions(): ListActionDef[] {
    return this.visibleActions(this.config.actions?.bulk);
  }

  get visibleDetailFooterActions(): ListActionDef[] {
    // Footer actions always act on the selected entity, and this getter is read
    // on every change detection pass (including while the sheet is closed), so
    // `when` predicates must never run without one.
    const entity = this.controller.dashboard.detailPage.selected;
    if (entity === undefined) return [];
    return this.visibleActions(this.config.actions?.detailFooter, { entity });
  }

  get visibleDetailMenuActions(): ListActionDef[] {
    const entity = this.controller.dashboard.detailPage.selected;
    if (entity === undefined) return [];
    return this.visibleActions(this.config.actions?.detailMenu, { entity });
  }

  get visibleFloatingActions(): ListActionDef[] {
    return this.visibleActions(this.config.actions?.floating);
  }

  /**
   * Row overflow actions for a single row. Evaluated per row rather than via
   * {@link visibleActions} so long lists don't recompute the whole selection
   * on every change detection pass.
   */
  rowMenuActionsFor(row: ListRowItem): ListActionDef[] {
    const actions = this.config.actions?.rowMenu;
    if (!actions?.length) return [];
    const entity = row.payload;
    if (entity === undefined) return [];
    const ctx = {
      ...this.controller.dashboard.buildContext(),
      selection: [entity],
      entity,
    };
    return actions.filter(action => action.when?.(ctx) ?? true);
  }

  hasRowMenuActions(row: ListRowItem): boolean {
    return this.rowMenuActionsFor(row).length > 0;
  }

  onRowMenuAction(action: ListActionDef, row: ListRowItem): void {
    const entity = row.payload as TEntity | undefined;
    this.controller.runAction(action.run, entity ? [entity] : [], action.actionFormId);
  }

  /**
   * The detail sheet steps aside while an action form (including the stepper
   * edit and bulk-edit flows) is open, so the two sheets never stack. Detail
   * state is kept, so closing the action form restores the sheet as it was.
   */
  get detailSheetOpen(): boolean {
    return this.controller.dashboard.detailPage.open && !this.controller.actionForm.open;
  }

  /** True when `detail.edit` runs as a stepper instead of the single-form sheet body. */
  get hasEditStepper(): boolean {
    return this.controller.hasEditStepper;
  }

  /** True when `bulkEdit` runs as a stepper instead of the bulk single-form sheet. */
  get hasBulkEditStepper(): boolean {
    return this.controller.hasBulkEditStepper;
  }

  onRowClick(row: ListRowItem): void {
    void this.controller.openDetail(row as ListRowItem<TEntity>);
  }

  onRowLinkClick(event: { item: ListRowItem; linkId: string }): void {
    const linkEvent = toListRowLinkEvent<TEntity>(event);
    this.rowLinkClick.emit(linkEvent);
    const operation = this.config.operations?.[event.linkId];
    if (operation && linkEvent.item.payload !== undefined) {
      operation(linkEvent.item.payload, linkEvent);
    }
  }

  onCreateSave(values: FormValues): void {
    this.controller.submitCreate(values);
  }

  onCreateValuesChange(values: FormValues): void {
    this.config.create?.onValuesChange?.(
      values,
      this.controller.dashboard.getCreateContext(),
    );
  }

  onAction(action: ListActionDef): void {
    this.controller.runAction(action.run, this.selectedEntities, action.actionFormId);
  }

  onDetailAction(action: ListActionDef): void {
    const entity = this.controller.dashboard.detailPage.selected;
    this.controller.runAction(action.run, entity ? [entity] : [], action.actionFormId);
  }

  onValidationError(message: string): void {
    this.controller.notify({ level: 'error', message });
  }

  private visibleActions(
    actions: ListActionDef[] | undefined,
    extra?: { entity?: unknown },
  ): ListActionDef[] {
    if (!actions?.length) return [];
    const ctx = {
      ...this.controller.dashboard.buildContext(),
      selection: this.selectedEntities,
      entity: extra?.entity,
    };
    return actions.filter(action => action.when?.(ctx) ?? true);
  }

  private asFormData(context: TContext | undefined): Readonly<Record<string, unknown>> | undefined {
    return context && typeof context === 'object'
      ? context as Readonly<Record<string, unknown>>
      : undefined;
  }
}
