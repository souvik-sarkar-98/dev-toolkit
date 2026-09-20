import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, catchError, of } from 'rxjs';
import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import { ListFileUpload, RefDataMap } from '@ssdev-toolkit/list-dashboard-core';
import {
  ListDetailField,
  ListDetailSection,
  ListDetailSheetMode,
} from '@ssdev-toolkit/list-dashboard-core';
import { ListRowItem } from '@ssdev-toolkit/list-dashboard-core';
import { ListDetailPageAdapter } from '@ssdev-toolkit/list-dashboard-core';
import {
  ListDetailRouteSync,
  ListDetailRouteSyncConfig,
} from './list-detail-route-sync';

export interface ListDetailPageInitOptions<TEntity> {
  adapter: ListDetailPageAdapter<TEntity>;
  route: ActivatedRoute;
  router: Router;
  routeSyncConfig: ListDetailRouteSyncConfig;
  refData: RefDataMap;
  getListItems: () => ListRowItem[];
  onEntityUpdated?: (entity: TEntity) => void;
  onSaveError?: (error: unknown) => void;
  setFormValue?: (key: string, value: unknown) => void;
  /** When true, detail open/edit/close does not read or write URL query params. */
  suppressRouteSync?: boolean;
}

/**
 * Orchestrates detail sheet state + route sync (mirrors {@link FilteredListPageController}).
 */
export class ListDetailPageController<TEntity> {
  open = false;
  title = 'Details';
  sections: ListDetailSection[] = [];
  loading = false;
  mode: ListDetailSheetMode = 'view';
  saving = false;
  primaryActionLabel?: string;
  editSummary: ListDetailField[] = [];
  editDefinition: FormDefinition | undefined;
  editInitialValues: FormValues = {};
  editShowDocumentUpload = false;
  editDocumentError?: string;
  editDocumentAllowedTypes: string[] = ['jpg', 'jpeg', 'png', 'pdf'];

  private adapter!: ListDetailPageAdapter<TEntity>;
  private route!: ActivatedRoute;
  private routeSync!: ListDetailRouteSync;
  private refData: RefDataMap = {};
  private getListItems!: () => ListRowItem[];
  private onEntityUpdated?: (entity: TEntity) => void;
  private onSaveError?: (error: unknown) => void;
  private setFormValue?: (key: string, value: unknown) => void;

  private selectedEntity?: TEntity;
  private editDocuments: ListFileUpload[] = [];
  private existingDocumentCount = 0;
  private pendingItemId?: string;
  private pendingEdit = false;
  private detailSub = new Subscription();

  init(options: ListDetailPageInitOptions<TEntity>): void {
    this.adapter = options.adapter;
    this.route = options.route;
    this.routeSync = new ListDetailRouteSync(options.route, options.router, options.routeSyncConfig);
    this.refData = options.refData;
    this.getListItems = options.getListItems;
    this.onEntityUpdated = options.onEntityUpdated;
    this.onSaveError = options.onSaveError;
    this.setFormValue = options.setFormValue;
    this.editDocumentAllowedTypes = this.adapter.editDocumentAllowedTypes
      ?? this.editDocumentAllowedTypes;
    if (options.suppressRouteSync) {
      this.routeSync.setSuppressed(true);
    }
    this.queuePendingFromRoute();
  }

  destroy(): void {
    this.detailSub.unsubscribe();
  }

  queuePendingFromRoute(): void {
    const pending = this.routeSync.readPendingFromRoute();
    if (!pending) {
      return;
    }
    this.pendingItemId = pending.itemId;
    this.pendingEdit = pending.edit;
  }

  tryOpenPending(): void {
    const itemId = this.pendingItemId;
    if (!itemId || this.open) {
      return;
    }

    const fromList = this.adapter.findInList(this.getListItems(), itemId);
    if (fromList) {
      this.pendingItemId = undefined;
      const edit = this.pendingEdit;
      this.pendingEdit = false;
      this.openEntity(fromList, { edit, syncQuery: false });
      this.routeSync.sync(this.entityId(fromList), edit ? 'edit' : 'view');
      return;
    }

    const requestedId = itemId;
    const edit = this.pendingEdit;
    this.pendingItemId = undefined;

    this.open = true;
    this.title = requestedId;
    this.loading = true;
    this.sections = [];
    this.mode = 'view';
    this.saving = false;
    this.primaryActionLabel = undefined;
    this.selectedEntity = undefined;
    this.resetEditState();

    this.detailSub.add(
      this.adapter.fetchById(requestedId).pipe(
        catchError(() => of(undefined)),
      ).subscribe(entity => {
        this.loading = false;
        if (!entity) {
          this.pendingEdit = false;
          this.open = false;
          this.routeSync.clear();
          return;
        }
        this.pendingEdit = false;
        this.openEntity(entity, { edit, syncQuery: false, refresh: false });
        this.routeSync.sync(this.entityId(entity), edit ? 'edit' : 'view');
      }),
    );
  }

  openEntity(
    entity: TEntity,
    options: { edit?: boolean; syncQuery?: boolean; refresh?: boolean } = {},
  ): void {
    const { edit = false, syncQuery = true, refresh = true } = options;

    this.selectedEntity = entity;
    this.title = this.adapter.getTitle(entity);
    this.mode = 'view';
    this.loading = false;
    this.saving = false;
    this.resetEditState();

    const viewSections = this.adapter.buildViewSections(entity, this.refData);
    const loadingSection = this.adapter.buildDocumentsLoadingSection?.();
    this.sections = loadingSection ? [...viewSections, loadingSection] : viewSections;
    this.primaryActionLabel = this.adapter.resolvePrimaryActionLabel?.(entity);
    this.open = true;

    if (this.adapter.loadDocumentsSection) {
      const documentsEntityId = this.adapter.resolveDocumentsEntityId?.(entity)
        ?? this.entityId(entity);
      this.loadDocuments(documentsEntityId);
    }

    if (syncQuery) {
      this.routeSync.sync(this.entityId(entity), edit ? 'edit' : 'view');
    }

    if (refresh && this.adapter.refreshOnOpen) {
      this.refreshSelected(entity);
    }

    if (edit && this.primaryActionLabel) {
      this.enterEdit();
    }
  }

  close(): void {
    this.open = false;
    this.mode = 'view';
    this.loading = false;
    this.saving = false;
    this.primaryActionLabel = undefined;
    this.selectedEntity = undefined;
    this.resetEditState();
    this.detailSub.unsubscribe();
    this.detailSub = new Subscription();
    this.routeSync.clear();
  }

  /** Stepper edit flows are hosted outside this sheet (see list dashboard runtime). */
  get hasEditStepper(): boolean {
    return this.adapter?.editFlowKind === 'stepper';
  }

  enterEdit(): void {
    const entity = this.selectedEntity;
    if (!entity || this.hasEditStepper) {
      return;
    }
    if (!this.adapter.buildEditSummary || !this.adapter.buildEditForm) {
      return;
    }

    const context = { entity, refData: this.refData };
    this.editSummary = this.adapter.buildEditSummary(context);
    this.editInitialValues = this.adapter.entityToEditValues?.(entity) ?? {};
    this.editDefinition = this.adapter.buildEditForm(context);
    this.mode = 'edit';
    this.resetEditDocuments();
    this.existingDocumentCount = this.getExistingDocumentCount();
    this.applyEditValuesChange(this.editInitialValues);
    this.routeSync.sync(this.entityId(entity), 'edit');
    this.adapter.prepareEdit?.(context, () => this.refreshEditForm());
  }

  cancelEdit(): void {
    this.mode = 'view';
    if (this.selectedEntity) {
      this.routeSync.sync(this.entityId(this.selectedEntity), 'view');
    }
  }

  onEditValuesChange(values: FormValues): void {
    const entity = this.selectedEntity;
    if (!entity) {
      return;
    }

    this.applyEditValuesChange(values, entity);
  }

  onEditDocumentsChange(files: ListFileUpload[]): void {
    this.editDocuments = files;
    if (files.length > 0) {
      this.editDocumentError = undefined;
    }
  }

  onEditSave(values: FormValues): void {
    const entity = this.selectedEntity;
    if (!entity || !this.adapter.save) {
      return;
    }

    const validationError = this.adapter.validateBeforeSave?.({
      entity,
      refData: this.refData,
      values,
      documents: this.editDocuments,
      existingDocumentCount: this.existingDocumentCount,
    });
    if (validationError) {
      this.editDocumentError = validationError;
      return;
    }

    this.saving = true;
    this.detailSub.add(
      this.adapter.save({
        entity,
        refData: this.refData,
        values,
        documents: this.editDocuments,
        existingDocumentCount: this.existingDocumentCount,
      }).subscribe({
        next: updated => {
          this.saving = false;
          this.applyUpdatedEntity(updated);
        },
        error: (err) => {
          this.saving = false;
          this.onSaveError?.(err);
        },
        complete: () => {
          this.saving = false;
        },
      }),
    );
  }

  setRefData(refData: RefDataMap): void {
    this.refData = refData;
  }

  get selected(): TEntity | undefined {
    return this.selectedEntity;
  }

  /** Re-renders the open sheet with the full entity; leaves list rows untouched. */
  private refreshSelected(entity: TEntity): void {
    const requestedId = this.entityId(entity);
    this.detailSub.add(
      this.adapter.refreshOnOpen!(entity).pipe(
        catchError(() => of(undefined)),
      ).subscribe(refreshed => {
        if (!refreshed || !this.open || !this.selectedEntity) return;
        if (this.entityId(this.selectedEntity) !== requestedId) return;

        this.selectedEntity = refreshed;
        this.title = this.adapter.getTitle(refreshed);
        this.primaryActionLabel = this.adapter.resolvePrimaryActionLabel?.(refreshed);
        if (this.mode !== 'view') return;

        const documentSections = this.sections.filter(section => section.type === 'documents');
        this.sections = [
          ...this.adapter.buildViewSections(refreshed, this.refData),
          ...documentSections,
        ];
      }),
    );
  }

  private applyUpdatedEntity(updated: TEntity): void {
    this.selectedEntity = updated;
    this.mode = 'view';
    const documentSections = this.sections.filter(section => section.type === 'documents');
    this.sections = [
      ...this.adapter.buildViewSections(updated, this.refData),
      ...documentSections,
    ];
    this.primaryActionLabel = this.adapter.resolvePrimaryActionLabel?.(updated);
    this.onEntityUpdated?.(updated);
    this.routeSync.sync(this.entityId(updated), 'view');
  }

  /** Deep-link id for an entity; titles are display values in most domains. */
  private entityId(entity: TEntity): string {
    return this.adapter.getEntityId?.(entity) ?? this.adapter.getTitle(entity);
  }

  private refreshEditForm(): void {
    const entity = this.selectedEntity;
    if (!entity || this.mode !== 'edit' || !this.adapter.refreshEditForm) {
      return;
    }
    this.editDefinition = this.adapter.refreshEditForm({ entity, refData: this.refData });
  }

  private applyEditValuesChange(values: FormValues, entity = this.selectedEntity): void {
    if (!entity || !this.adapter.onEditValuesChange) {
      return;
    }

    const result = this.adapter.onEditValuesChange(
      { entity, refData: this.refData },
      values,
      this.setFormValue,
    );

    if (!result) {
      return;
    }

    if (result.showDocumentUpload !== undefined) {
      this.editShowDocumentUpload = result.showDocumentUpload;
    }
    if (result.clearDocuments) {
      this.editDocumentError = undefined;
      this.editDocuments = [];
    }
    if (result.documentError !== undefined) {
      this.editDocumentError = result.documentError;
    }
  }

  private loadDocuments(entityId: string): void {
    if (!this.adapter.loadDocumentsSection) {
      return;
    }

    this.detailSub.add(
      this.adapter.loadDocumentsSection(entityId).subscribe({
        next: section => this.replaceDocumentsSection(section),
        error: () => {
          if (this.adapter.loadDocumentsSection) {
            this.replaceDocumentsSection({
              type: 'documents',
              id: 'document_list',
              title: 'Documents',
              documents: [],
            });
          }
        },
      }),
    );
  }

  private replaceDocumentsSection(section: ListDetailSection): void {
    const withoutDocuments = this.sections.filter(item => item.type !== 'documents');
    this.sections = [...withoutDocuments, section];
  }

  private getExistingDocumentCount(): number {
    const documentsSection = this.sections.find(section => section.type === 'documents');
    return documentsSection?.type === 'documents' ? documentsSection.documents.length : 0;
  }

  private resetEditState(): void {
    this.editSummary = [];
    this.editDefinition = undefined;
    this.editInitialValues = {};
    this.resetEditDocuments();
  }

  private resetEditDocuments(): void {
    this.editDocuments = [];
    this.editDocumentError = undefined;
    this.editShowDocumentUpload = false;
    this.existingDocumentCount = 0;
  }
}
