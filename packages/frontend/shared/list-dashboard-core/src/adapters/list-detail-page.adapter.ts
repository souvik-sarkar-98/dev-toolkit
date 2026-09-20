import type { Observable } from 'rxjs';
import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { RefDataMap } from '../types/ref-data.js';
import type { ListFileUpload } from '../types/uploads.js';
import type { ListRowItem } from '../models/infinite-list.model.js';
import type { ListDetailField, ListDetailSection } from '../models/list-detail.model.js';

export interface ListDetailEditContext<TEntity> {
  entity: TEntity;
  refData: RefDataMap;
}

export interface ListDetailSaveContext<TEntity> {
  entity: TEntity;
  refData: RefDataMap;
  values: FormValues;
  documents: ListFileUpload[];
  existingDocumentCount: number;
  /** Data collected by custom stepper steps (`edit.kind: 'stepper'` only). */
  customStepData?: Record<string, unknown>;
}

/** Domain-specific detail sheet config for {@link ListDetailPageController}. */
export interface ListDetailPageAdapter<TEntity> {
  getTitle(entity: TEntity): string;

  /**
   * Stable id used for deep links and document lookups. Falls back to
   * {@link getTitle}, so configs whose title is not the id must implement it.
   */
  getEntityId?(entity: TEntity): string;

  buildViewSections(entity: TEntity, refData: RefDataMap): ListDetailSection[];

  /** Placeholder section shown while async document sections load. */
  buildDocumentsLoadingSection?(): ListDetailSection;

  /** Returns a documents section to merge into view sections. */
  loadDocumentsSection?(entityId: string): Observable<ListDetailSection>;

  resolveDocumentsEntityId?(entity: TEntity): string;

  fetchById(id: string): Observable<TEntity | undefined>;

  findInList(items: ListRowItem[], id: string): TEntity | undefined;

  /** Loads the full entity after the sheet opens from a list row. */
  refreshOnOpen?(entity: TEntity): Observable<TEntity | undefined>;

  resolvePrimaryActionLabel?(entity: TEntity): string | undefined;

  buildEditSummary?(context: ListDetailEditContext<TEntity>): ListDetailField[];

  buildEditForm?(context: ListDetailEditContext<TEntity>): FormDefinition;

  entityToEditValues?(entity: TEntity): FormValues;

  /** Called when payable-account options (or similar) load after entering edit mode. */
  refreshEditForm?(context: ListDetailEditContext<TEntity>): FormDefinition | undefined;

  /** Prepare edit mode (e.g. load payable accounts). Optional callback when ready. */
  prepareEdit?(context: ListDetailEditContext<TEntity>, onReady?: () => void): void;

  onEditValuesChange?(
    context: ListDetailEditContext<TEntity>,
    values: FormValues,
    setFormValue?: (key: string, value: unknown) => void,
  ): {
    showDocumentUpload?: boolean;
    documentError?: string;
    clearDocuments?: boolean;
  } | void;

  validateBeforeSave?(context: ListDetailSaveContext<TEntity>): string | undefined;

  save?(context: ListDetailSaveContext<TEntity>): Observable<TEntity>;

  editDocumentAllowedTypes?: string[];

  /** `stepper` means the edit flow is hosted outside the single-form detail body. */
  editFlowKind?: 'form' | 'stepper';
}
