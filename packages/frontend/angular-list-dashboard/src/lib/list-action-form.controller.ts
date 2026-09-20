import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { CfFormStepperStep } from '@ssdev-toolkit/angular-forms';
import { Subscription, isObservable } from 'rxjs';
import type {
  ListActionFormConfig,
  ListActionFormContext,
  ListActionFormValuesChangeResult,
  ListFileUpload,
  ListFormCustomStepDef,
  ListFormFlowKind,
  RefDataMap,
} from '@ssdev-toolkit/list-dashboard-core';

export interface ListActionFormSaved<TEntity> {
  actionFormId: string;
  config: ListActionFormConfig<TEntity>;
  entity: TEntity;
  result: unknown;
}

export interface ListActionFormInitOptions<TEntity> {
  /** Resolves a named entry from `ListDashboardConfig.actionForms`. */
  resolveConfig: (actionFormId: string) => ListActionFormConfig<TEntity> | undefined;
  refData: () => RefDataMap;
  activeChip: () => string;
  permissions: () => Record<string, boolean | undefined>;
  preparationContext?: () => unknown;
  setFormValue?: (key: string, value: unknown) => void;
  onSaved?: (saved: ListActionFormSaved<TEntity>) => void;
  onError?: (error: unknown, actionFormId: string) => void;
  onValidationError?: (message: string) => void;
}

const EMPTY_DEFINITION: FormDefinition = {
  id: '',
  key: '',
  label: '',
  description: null,
  fields: [],
};

/**
 * Sheet state for one config-driven action form (`form` or `stepper`).
 * Also hosts synthetic flows built from `detail.edit` / `bulkEdit` stepper configs.
 */
export class ListActionFormController<TEntity> {
  open = false;
  saving = false;
  loading = false;
  actionFormId?: string;
  title = '';
  definition?: FormDefinition;
  initialValues: FormValues = {};
  documents: ListFileUpload[] = [];
  customStepData: Record<string, unknown> = {};
  showDocumentUpload = false;
  documentError?: string;
  documentAllowedTypes: string[] = ['jpg', 'jpeg', 'png', 'pdf'];
  documentUploadHint?: string;
  saveLabel = 'Save';

  private options?: ListActionFormInitOptions<TEntity>;
  private activeConfig?: ListActionFormConfig<TEntity>;
  private entity?: TEntity;
  private latestValues: FormValues = {};
  private subscription = new Subscription();

  init(options: ListActionFormInitOptions<TEntity>): void {
    this.options = options;
    this.close();
  }

  destroy(): void {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
    this.open = false;
  }

  get config(): ListActionFormConfig<TEntity> | undefined {
    return this.activeConfig;
  }

  get kind(): ListFormFlowKind {
    return this.activeConfig?.kind ?? 'form';
  }

  get selected(): TEntity | undefined {
    return this.entity;
  }

  get steps(): CfFormStepperStep[] {
    return (this.activeConfig?.steps ?? []) as CfFormStepperStep[];
  }

  get customSteps(): Record<string, ListFormCustomStepDef> | undefined {
    return this.activeConfig?.customSteps;
  }

  get values(): FormValues {
    return this.latestValues;
  }

  /** Opens the entry registered under `actionFormId` in the dashboard config. */
  openForm(actionFormId: string, entity: TEntity | undefined): boolean {
    const config = this.options?.resolveConfig(actionFormId);
    if (!config) return false;
    return this.openWith(actionFormId, config, entity);
  }

  /** Opens an explicit config — used for detail-edit and bulk-edit stepper flows. */
  openWith(
    actionFormId: string,
    config: ListActionFormConfig<TEntity>,
    entity: TEntity | undefined,
  ): boolean {
    if (entity === undefined) return false;

    this.resetState();
    this.actionFormId = actionFormId;
    this.activeConfig = config;
    this.entity = entity;
    this.title = typeof config.title === 'function' ? config.title(entity) : config.title;
    this.saveLabel = config.saveLabel ?? 'Save';
    this.documentAllowedTypes = config.documentTypes ?? this.documentAllowedTypes;
    this.documentUploadHint = config.documentUploadHint;
    this.showDocumentUpload = typeof config.showDocumentUpload === 'function'
      ? config.showDocumentUpload(entity)
      : config.showDocumentUpload ?? false;

    const values = config.defaultValues(entity, {
      refData: this.refData,
      activeChip: this.activeChip,
      preparationContext: this.preparationContext,
    });
    this.initialValues = values;
    this.latestValues = { ...values };
    this.customStepData = config.defaultCustomStepData?.(entity, {
      refData: this.refData,
      activeChip: this.activeChip,
      preparationContext: this.preparationContext,
    }) ?? {};
    this.definition = config.buildForm?.(entity, {
      refData: this.refData,
      values,
      preparationContext: this.preparationContext,
    });
    this.open = true;
    return true;
  }

  close(): void {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
    this.resetState();
  }

  onValuesChange(values: FormValues): void {
    this.latestValues = values;
    const config = this.activeConfig;
    const entity = this.entity;
    if (!config?.onValuesChange || entity === undefined) return;

    const result = config.onValuesChange(entity, values, {
      refData: this.refData,
      setFormValue: this.options?.setFormValue,
      preparationContext: this.preparationContext,
    });
    if (!result) return;

    if (isObservable(result)) {
      this.loading = true;
      this.subscription.add(
        result.subscribe({
          next: value => {
            this.loading = false;
            this.applyValuesChangeResult(value);
          },
          error: error => {
            this.loading = false;
            this.options?.onError?.(error, this.actionFormId ?? '');
          },
          complete: () => {
            this.loading = false;
          },
        }),
      );
      return;
    }

    if (result instanceof Promise) {
      this.loading = true;
      void result.then(
        value => {
          this.loading = false;
          this.applyValuesChangeResult(value);
        },
        error => {
          this.loading = false;
          this.options?.onError?.(error, this.actionFormId ?? '');
        },
      );
      return;
    }

    this.applyValuesChangeResult(result);
  }

  onDocumentsChange(files: ListFileUpload[]): void {
    this.documents = files;
    if (files.length) {
      this.documentError = undefined;
    }
  }

  onCustomStepDataChange(change: { stepId: string; data: unknown }): void {
    this.customStepData = { ...this.customStepData, [change.stepId]: change.data };
  }

  buildStepDefinition = (stepId: string, values: FormValues): FormDefinition => {
    const build = this.activeConfig?.buildStepDefinition;
    if (!build) return EMPTY_DEFINITION;
    return build(stepId, values, this.buildContext(values));
  };

  resolveSteps = (values: FormValues): string[] => {
    const resolved = this.activeConfig?.resolveSteps?.(values);
    return resolved ?? this.steps.map(step => step.id);
  };

  validateStep = (stepId: string, values: FormValues): string | undefined =>
    this.activeConfig?.validateStep?.(stepId, values, this.buildContext(values));

  prepareStep = (stepId: string, values: FormValues): Promise<void> | void =>
    this.activeConfig?.prepareStep?.(stepId, values, this.buildContext(values));

  submit(values: FormValues): void {
    const config = this.activeConfig;
    const entity = this.entity;
    const actionFormId = this.actionFormId;
    if (!config || entity === undefined || !actionFormId || this.saving) return;

    this.latestValues = values;
    const context = this.buildContext(values);
    const validationError = config.validateBeforeSave?.(context);
    if (validationError) {
      this.documentError = validationError;
      this.options?.onValidationError?.(validationError);
      return;
    }

    this.saving = true;
    this.subscription.add(
      config.save(context).subscribe({
        next: result => {
          this.saving = false;
          this.options?.onSaved?.({ actionFormId, config, entity, result });
        },
        error: error => {
          this.saving = false;
          this.options?.onError?.(error, actionFormId);
        },
        // Feature saves may complete empty (e.g. confirm Cancel via filter, or EMPTY after a handled error).
        complete: () => {
          this.saving = false;
        },
      }),
    );
  }

  private buildContext(values: FormValues): ListActionFormContext<TEntity> {
    return {
      entity: this.entity as TEntity,
      refData: this.refData,
      values,
      documents: this.documents,
      customStepData: this.customStepData,
      activeChip: this.activeChip,
      permissions: this.options?.permissions() ?? {},
      preparationContext: this.preparationContext,
    };
  }

  private applyValuesChangeResult(result: ListActionFormValuesChangeResult | void): void {
    if (!result) return;
    if (result.definition) {
      this.definition = result.definition;
    }
    if (result.values) {
      this.initialValues = result.values;
      this.latestValues = { ...result.values };
    }
    if (result.loading !== undefined) {
      this.loading = result.loading;
    }
    if (result.showDocumentUpload !== undefined) {
      this.showDocumentUpload = result.showDocumentUpload;
    }
    if (result.clearDocuments) {
      this.documents = [];
      this.documentError = undefined;
    }
    if (result.documentError !== undefined) {
      this.documentError = result.documentError;
    }
  }

  private resetState(): void {
    this.open = false;
    this.saving = false;
    this.loading = false;
    this.actionFormId = undefined;
    this.activeConfig = undefined;
    this.entity = undefined;
    this.title = '';
    this.definition = undefined;
    this.initialValues = {};
    this.latestValues = {};
    this.documents = [];
    this.customStepData = {};
    this.showDocumentUpload = false;
    this.documentError = undefined;
    this.documentUploadHint = undefined;
  }

  private get refData(): RefDataMap {
    return this.options?.refData() ?? {};
  }

  private get activeChip(): string {
    return this.options?.activeChip() ?? '';
  }

  private get preparationContext(): unknown {
    return this.options?.preparationContext?.();
  }
}
