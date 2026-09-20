import type { FormDefinition, FormValues } from '@ssdev-toolkit/forms-core';
import type { Observable } from 'rxjs';
import type { RefDataMap } from '../types/ref-data.js';
import type { ListFileUpload } from '../types/uploads.js';

/** Shared form UI tier used by create, detail edit, bulk edit, and action forms. */
export type ListFormFlowKind = 'form' | 'stepper';

/** Stepper step — mirrors CfFormStepperStep without Angular dependency. */
export interface ListFormStepperStep<T extends string = string> {
  id: T;
  label: string;
  kind: 'form' | 'custom';
}

export type ListFormStepperResolveSteps<T extends string = string> = (
  values: FormValues,
) => T[];

/** Framework-neutral custom step declaration (Angular maps rendererKey → component). */
export interface ListFormCustomStepDef {
  rendererKey: string;
}

/** Shared stepper hooks; context type varies by surface (create vs edit vs action). */
export interface ListFormStepperHooks<TContext = unknown> {
  steps?: ListFormStepperStep[];
  buildStepDefinition?: (
    stepId: string,
    values: FormValues,
    ctx: TContext,
  ) => FormDefinition;
  resolveSteps?: ListFormStepperResolveSteps;
  validateStep?: (
    stepId: string,
    values: FormValues,
    ctx: TContext,
  ) => string | undefined;
  /**
   * Awaited before a step is entered, so a step can load only what the choices
   * made on earlier steps require instead of preloading every variant.
   */
  prepareStep?: (
    stepId: string,
    values: FormValues,
    ctx: TContext,
  ) => Promise<void> | void;
  customSteps?: Record<string, ListFormCustomStepDef>;
}

export type ListActionFormSuccessMode = 'reloadList' | 'updateEntity' | 'none';

export interface ListActionFormContext<TEntity = unknown> {
  entity: TEntity;
  refData: RefDataMap;
  values: FormValues;
  documents: ListFileUpload[];
  customStepData: Record<string, unknown>;
  activeChip: string;
  permissions: Record<string, boolean | undefined>;
  preparationContext?: unknown;
}

export interface ListActionFormValuesChangeResult {
  definition?: FormDefinition;
  values?: FormValues;
  loading?: boolean;
  clearDocuments?: boolean;
  showDocumentUpload?: boolean;
  documentError?: string;
}

/**
 * Declarative detail/bulk/floating action form opened by the dashboard
 * (not page-owned bespoke sheets).
 */
export interface ListActionFormConfig<TEntity = unknown>
  extends ListFormStepperHooks<ListActionFormContext<TEntity>> {
  kind?: ListFormFlowKind;
  title: string | ((entity: TEntity) => string);
  saveLabel?: string;
  documentTypes?: string[];
  showDocumentUpload?: boolean | ((entity: TEntity) => boolean);
  documentUploadHint?: string;
  /** Preparation trigger task ids (resolved via dashboard preparation). */
  preparationTasks?: string[];
  defaultValues: (entity: TEntity, ctx: {
    refData: RefDataMap;
    activeChip: string;
    preparationContext?: unknown;
  }) => FormValues;
  /** Initial data for custom stepper steps keyed by step id. */
  defaultCustomStepData?: (entity: TEntity, ctx: {
    refData: RefDataMap;
    activeChip: string;
    preparationContext?: unknown;
  }) => Record<string, unknown>;
  buildForm?: (entity: TEntity, ctx: {
    refData: RefDataMap;
    values: FormValues;
    preparationContext?: unknown;
  }) => FormDefinition;
  onValuesChange?: (
    entity: TEntity,
    values: FormValues,
    ctx: {
      refData: RefDataMap;
      setFormValue?: (key: string, value: unknown) => void;
      preparationContext?: unknown;
    },
  ) => ListActionFormValuesChangeResult
    | void
    | Promise<ListActionFormValuesChangeResult | void>
    | Observable<ListActionFormValuesChangeResult | void>;
  validateBeforeSave?: (context: ListActionFormContext<TEntity>) => string | undefined;
  save: (context: ListActionFormContext<TEntity>) => Observable<TEntity | void | unknown>;
  success?: {
    mode?: ListActionFormSuccessMode;
    reopenDetail?: boolean;
    message?: string;
  };
}
