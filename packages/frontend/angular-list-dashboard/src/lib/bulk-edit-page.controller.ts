import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import { Subscription } from 'rxjs';
import { ListFileUpload, RefDataMap } from '@ssdev-toolkit/list-dashboard-core';
import { ListDetailField } from '@ssdev-toolkit/list-dashboard-core';
import { BulkEditPageConfig } from '@ssdev-toolkit/list-dashboard-core';

/**
 * Edit-only overlay state for bulk updates — drives a second {@link ListDetailSheetComponent}.
 */
export class BulkEditPageController<TEntity> {
  open = false;
  title = 'Bulk Update';
  saving = false;
  editSummary: ListDetailField[] = [];
  editDefinition?: FormDefinition;
  editInitialValues: FormValues = {};
  editShowDocumentUpload = false;
  editDocumentError?: string;
  editDocumentAllowedTypes: string[] = ['jpg', 'jpeg', 'png', 'pdf'];

  private entities: TEntity[] = [];
  private config?: BulkEditPageConfig<TEntity>;
  private refData: RefDataMap = {};
  private payableAccountOptions: { key: string; label: string }[] = [];
  private editDocuments: ListFileUpload[] = [];
  private template?: TEntity;
  private saveSub = new Subscription();
  private onSaved?: (entities: TEntity[]) => void;
  private onSaveError?: (error: unknown) => void;
  private setFormValue?: (key: string, value: unknown) => void;

  init(options: {
    config: BulkEditPageConfig<TEntity>;
    refData: RefDataMap;
    onSaved?: (entities: TEntity[]) => void;
    onSaveError?: (error: unknown) => void;
    setFormValue?: (key: string, value: unknown) => void;
  }): void {
    this.config = options.config;
    this.refData = options.refData;
    this.onSaved = options.onSaved;
    this.onSaveError = options.onSaveError;
    this.setFormValue = options.setFormValue;
    this.title = options.config.title ?? this.title;
    this.editDocumentAllowedTypes = options.config.documentTypes ?? this.editDocumentAllowedTypes;
  }

  destroy(): void {
    this.saveSub.unsubscribe();
  }

  setRefData(refData: RefDataMap): void {
    this.refData = refData;
  }

  openBulkEdit(entities: TEntity[]): boolean {
    const config = this.config;
    if (!config || !entities.length) {
      return false;
    }
    if (!config.validateSelection(entities)) {
      return false;
    }

    this.entities = entities;
    this.template = { ...entities[0] } as TEntity;
    this.editInitialValues = config.entityToEditValues(this.template);
    this.editSummary = config.buildEditSummary(entities, this.refData);

    const prepare = () => {
      this.editDefinition = this.applyLockedFields(
        config.buildEditForm(this.template!, this.refData, this.payableAccountOptions),
        config.lockedFields,
      );
      this.applyValuesChange(this.editInitialValues);
      this.open = true;
    };

    if (config.prepareEdit) {
      config.prepareEdit(accounts => {
        this.payableAccountOptions = accounts;
        prepare();
      });
    } else {
      prepare();
    }

    return true;
  }

  close(): void {
    this.open = false;
    this.saving = false;
    this.entities = [];
    this.template = undefined;
    this.editDefinition = undefined;
    this.editInitialValues = {};
    this.editSummary = [];
    this.editShowDocumentUpload = false;
    this.editDocumentError = undefined;
    this.editDocuments = [];
  }

  onEditValuesChange(values: FormValues): void {
    const config = this.config;
    const template = this.template;
    if (!config || !template) {
      return;
    }

    this.applyValuesChange(values, template);

    if (config.refreshEditForm) {
      this.editDefinition = this.applyLockedFields(
        config.refreshEditForm(template, this.refData, this.payableAccountOptions),
        config.lockedFields,
      );
    }
  }

  onEditDocumentsChange(files: ListFileUpload[]): void {
    this.editDocuments = files;
    if (files.length > 0) {
      this.editDocumentError = undefined;
    }
  }

  onEditSave(values: FormValues): void {
    const config = this.config;
    const template = this.template;
    if (!config || !template || !this.entities.length) {
      return;
    }

    const validationError = config.validateBeforeSave?.(
      template,
      values,
      this.editDocuments,
      this.refData,
    );
    if (validationError) {
      this.editDocumentError = validationError;
      return;
    }

    this.saving = true;
    this.saveSub.add(
      config.save(this.entities, values, this.editDocuments).subscribe({
        next: updated => {
          this.saving = false;
          this.onSaved?.(updated);
          this.close();
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

  private applyValuesChange(values: FormValues, template = this.template!): void {
    const config = this.config;
    if (!config?.onEditValuesChange) {
      return;
    }

    const result = config.onEditValuesChange(template, values, this.setFormValue, this.refData);
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

  private applyLockedFields(
    definition: FormDefinition,
    lockedFields?: string[],
  ): FormDefinition {
    if (!lockedFields?.length) {
      return definition;
    }

    return {
      ...definition,
      fields: definition.fields.map(field =>
        lockedFields.includes(field.key)
          ? { ...field, enabled: false }
          : field,
      ),
    };
  }
}
