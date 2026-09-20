import type { RefDataMap } from '../types/ref-data.js';
import type { BulkEditPageConfig } from '../config/filtered-list-dashboard.config.js';
import type { ListDetailEditPageConfig } from '../config/list-detail-page.config.js';

export type DetailDerivedBulkEditHooks<TEntity> = Pick<
  BulkEditPageConfig<TEntity>,
  | 'documentTypes'
  | 'lockedFields'
  | 'entityToEditValues'
  | 'buildEditForm'
  | 'refreshEditForm'
  | 'prepareEdit'
  | 'onEditValuesChange'
  | 'validateBeforeSave'
>;

export interface DeriveBulkEditFromDetailEditOptions<TEntity> {
  /** Maps detail {@link ListDetailEditPageConfig.prepareEdit} to bulk payable-account loading. */
  preparePayableAccounts?: (
    onReady: (payableAccountOptions: { key: string; label: string }[]) => void,
  ) => void;
}

/** Reuses single-entity detail edit hooks for bulk edit overlays. */
export function deriveBulkEditHooksFromDetailEdit<TEntity>(
  edit: ListDetailEditPageConfig<TEntity>,
  options: DeriveBulkEditFromDetailEditOptions<TEntity> = {},
): DetailDerivedBulkEditHooks<TEntity> {
  const prepareEdit = options.preparePayableAccounts
    ?? (edit.prepareEdit
      ? (onReady: (payableAccountOptions: { key: string; label: string }[]) => void) => {
          edit.prepareEdit!(
            { entity: {} as TEntity, refData: {} as RefDataMap },
            () => onReady([]),
          );
        }
      : undefined);

  return {
    documentTypes: edit.documentTypes,
    lockedFields: edit.lockedFields,
    entityToEditValues: edit.entityToEditValues,
    buildEditForm: (template, refData, _payableAccountOptions) =>
      edit.buildEditForm({ entity: template, refData }),
    refreshEditForm: edit.refreshEditForm
      ? (template, refData, _payableAccountOptions) =>
          edit.refreshEditForm!({ entity: template, refData })
      : undefined,
    prepareEdit,
    onEditValuesChange: (template, values, setFormValue, refData = {}) =>
      edit.onEditValuesChange?.({ entity: template, refData }, values, setFormValue),
    validateBeforeSave: (template, values, documents, refData = {}) =>
      edit.validateBeforeSave?.({
        entity: template,
        refData,
        values,
        documents,
        existingDocumentCount: 0,
      }),
  };
}
