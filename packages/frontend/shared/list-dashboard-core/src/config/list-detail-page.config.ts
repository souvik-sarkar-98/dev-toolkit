import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { Observable } from 'rxjs';
import type { RefDataMap } from '../types/ref-data.js';
import type { ListRowItem } from '../models/infinite-list.model.js';
import type { ListDetailField, ListDetailSection } from '../models/list-detail.model.js';
import {
  ListDetailEditContext,
  ListDetailSaveContext,
  ListDetailPageAdapter,
} from '../adapters/list-detail-page.adapter.js';
import type {
  ListFormFlowKind,
  ListFormStepperHooks,
} from './list-form-flow.config.js';

export interface ListDetailConfigContext {
  activeChip: () => string;
  canUpdate: () => boolean;
}

export interface ListDetailPrimaryActionContext<TEntity> extends ListDetailConfigContext {
  entity: TEntity;
}

export interface ListDetailEditPageConfig<TEntity>
  extends ListFormStepperHooks<ListDetailEditContext<TEntity>> {
  /** Defaults to `form`. */
  kind?: ListFormFlowKind;
  documentTypes?: string[];
  buildEditSummary: (context: ListDetailEditContext<TEntity>) => ListDetailField[];
  buildEditForm: (context: ListDetailEditContext<TEntity>) => FormDefinition;
  entityToEditValues: (entity: TEntity) => FormValues;
  refreshEditForm?: (context: ListDetailEditContext<TEntity>) => FormDefinition;
  prepareEdit?: (context: ListDetailEditContext<TEntity>, onReady?: () => void) => void;
  onEditValuesChange?: (
    context: ListDetailEditContext<TEntity>,
    values: FormValues,
    setFormValue?: (key: string, value: unknown) => void,
  ) => {
    showDocumentUpload?: boolean;
    documentError?: string;
    clearDocuments?: boolean;
  } | void;
  validateBeforeSave?: (context: ListDetailSaveContext<TEntity>) => string | undefined;
  save: (context: ListDetailSaveContext<TEntity>) => Observable<TEntity>;
  /** Lock fields read-only in bulk edit mode. */
  lockedFields?: string[];
}

export interface ListDetailDocumentsConfig<TEntity> {
  buildLoadingSection?: () => ListDetailSection;
  loadSection: (entityId: string) => Observable<ListDetailSection>;
  /** When the sheet title id differs from the documents API id (e.g. ref vs internal id). */
  resolveEntityId?: (entity: TEntity) => string;
}

/** Declarative detail config consumed by {@link createDetailPageAdapter}. */
export interface ListDetailPageConfig<TEntity> {
  getTitle: (entity: TEntity) => string;
  /**
   * Id written to the URL for deep links (and used for documents when
   * `documents.resolveEntityId` is absent). Required whenever the title is a
   * display value rather than the id `fetchById` expects.
   */
  getEntityId?: (entity: TEntity) => string;
  buildViewSections: (entity: TEntity, refData: RefDataMap) => ListDetailSection[];
  documents?: ListDetailDocumentsConfig<TEntity>;
  fetchById: (id: string) => Observable<TEntity | undefined>;
  findInList: (items: ListRowItem[], id: string) => TEntity | undefined;
  /**
   * Loads the full entity when the sheet opens from a list row, for domains
   * whose detail endpoint returns more than the list payload. Receives the row
   * entity so the result can keep fields only the list knows about; the sheet
   * renders the row entity until it resolves.
   */
  refreshOnOpen?: (entity: TEntity) => Observable<TEntity | undefined>;
  primaryAction?: {
    label: string;
    when: (ctx: ListDetailPrimaryActionContext<TEntity>) => boolean;
  };
  edit: ListDetailEditPageConfig<TEntity>;
}

export interface ConfiguredDetailPageAdapter<TEntity>
  extends ListDetailPageAdapter<TEntity> {
  configure(context: ListDetailConfigContext): void;
}

export type { ListDetailEditContext, ListDetailSaveContext };
