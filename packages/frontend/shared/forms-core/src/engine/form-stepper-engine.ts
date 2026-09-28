import type { FormDefinition, FormValues } from '../models/types.js';
import { hasSameFormValues } from './form-values-equal.js';
import { mergeStepValues } from './merge-step-values.js';

export interface FormStepperStep<T extends string = string> {
  id: T;
  label: string;
  kind: 'form' | 'custom';
}

export interface FormStepperStepChange<T extends string = string> {
  stepId: T;
  values: FormValues;
}

export interface FormStepperState<T extends string = string> {
  stepId: T;
  stepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  preparing: boolean;
}

export type FormStepperBuildDefinition<T extends string = string> = (
  stepId: T,
  values: FormValues,
) => FormDefinition;

export type FormStepperResolveSteps<T extends string = string> = (
  values: FormValues,
) => T[];

export type FormStepperValidateStep<T extends string = string> = (
  stepId: T,
  values: FormValues,
) => string | undefined;

/**
 * Runs before a step is entered. `signal` is aborted when a newer navigation
 * supersedes this preparation (frameworks may ignore it).
 */
export type FormStepperPrepareStep<T extends string = string> = (
  stepId: T,
  values: FormValues,
  signal?: AbortSignal,
) => Promise<void> | void;

export type FormStepperCustomStepValidator = () => boolean;

export interface FormStepperNextInput {
  formValid: boolean;
  customValid: boolean;
  validationMessage: string;
}

export type FormStepperBackResult<T extends string> =
  | { type: 'blocked' }
  | { type: 'cancel' }
  | { type: 'goto'; stepId: T };

export type FormStepperNextResult<T extends string> =
  | { type: 'blocked' }
  | { type: 'invalid'; message: string }
  | { type: 'complete'; values: FormValues }
  | { type: 'goto'; stepId: T };

export type FormStepperEnterResult =
  | { ok: true }
  | { ok: false; error?: string; superseded?: boolean };

export interface FormStepperEngineOptions<T extends string = string> {
  steps: FormStepperStep<T>[];
  resolveSteps?: FormStepperResolveSteps<T>;
  validateStep?: FormStepperValidateStep<T>;
  prepareStep?: FormStepperPrepareStep<T>;
  initialValues?: FormValues;
}

export class FormStepperEngine<T extends string = string> {
  private steps: FormStepperStep<T>[] = [];
  private resolveStepsFn?: FormStepperResolveSteps<T>;
  private validateStepFn?: FormStepperValidateStep<T>;
  private prepareStepFn?: FormStepperPrepareStep<T>;
  private formValues: FormValues = {};
  private liveStepValues: FormValues = {};
  private currentStepId!: T;
  private preparing = false;
  private prepareGeneration = 0;
  private abort?: AbortController;

  constructor(options?: FormStepperEngineOptions<T>) {
    if (options) {
      this.configure(options);
    }
  }

  configure(options: FormStepperEngineOptions<T>): void {
    this.steps = options.steps;
    this.updateHooks(options);
    this.reset(options.initialValues ?? {});
  }

  updateHooks(options: Pick<FormStepperEngineOptions<T>, 'resolveSteps' | 'validateStep' | 'prepareStep' | 'steps'>): void {
    if (options.steps) this.steps = options.steps;
    if ('resolveSteps' in options) this.resolveStepsFn = options.resolveSteps;
    if ('validateStep' in options) this.validateStepFn = options.validateStep;
    if ('prepareStep' in options) this.prepareStepFn = options.prepareStep;
  }

  shouldResetForInitialValues(previous: FormValues | undefined, next: FormValues): boolean {
    if (!previous) return true;
    return !hasSameFormValues(previous, next);
  }

  reset(initialValues: FormValues = {}): void {
    this.cancelPreparation();
    this.formValues = { ...initialValues };
    this.liveStepValues = {};
    const ids = this.activeStepIds;
    this.currentStepId = ids[0] ?? this.steps[0]?.id;
  }

  getValues(): FormValues {
    return { ...this.formValues };
  }

  get effectiveValues(): FormValues {
    return { ...this.formValues, ...this.liveStepValues };
  }

  get activeStepIds(): T[] {
    if (this.resolveStepsFn) {
      return this.resolveStepsFn(this.effectiveValues);
    }
    return this.steps.map((step) => step.id);
  }

  get stepIndex(): number {
    return this.activeStepIds.indexOf(this.currentStepId);
  }

  get currentStepIdValue(): T {
    return this.currentStepId;
  }

  get currentStepKind(): 'form' | 'custom' {
    return this.steps.find((step) => step.id === this.currentStepId)?.kind ?? 'form';
  }

  get currentStepLabel(): string {
    return this.steps.find((step) => step.id === this.currentStepId)?.label ?? '';
  }

  get preparingValue(): boolean {
    return this.preparing;
  }

  getState(): FormStepperState<T> {
    const ids = this.activeStepIds;
    const stepIndex = Math.max(0, ids.indexOf(this.currentStepId));
    const totalSteps = Math.max(ids.length, 1);
    return {
      stepId: this.currentStepId,
      stepIndex,
      totalSteps,
      isFirstStep: stepIndex <= 0,
      isLastStep: stepIndex >= totalSteps - 1,
      preparing: this.preparing,
    };
  }

  setLiveStepValues(values: FormValues): { stepChanged: boolean } {
    this.liveStepValues = { ...values };
    const ids = this.activeStepIds;
    if (!ids.length || ids.includes(this.currentStepId)) {
      return { stepChanged: false };
    }
    this.currentStepId = ids[0];
    this.liveStepValues = {};
    return { stepChanged: true };
  }

  mergeFormStep(stepValues: FormValues, conditionHiddenKeys: readonly string[]): void {
    this.formValues = mergeStepValues(this.formValues, stepValues, conditionHiddenKeys);
    this.liveStepValues = {};
  }

  clearLiveStepValues(): void {
    this.liveStepValues = {};
  }

  requestBack(): FormStepperBackResult<T> {
    if (this.preparing) {
      return { type: 'blocked' };
    }
    if (this.stepIndex <= 0) {
      return { type: 'cancel' };
    }
    return { type: 'goto', stepId: this.activeStepIds[this.stepIndex - 1] };
  }

  requestNext(input: FormStepperNextInput): FormStepperNextResult<T> {
    if (this.preparing) {
      return { type: 'blocked' };
    }

    if (this.currentStepKind === 'form' && !input.formValid) {
      return { type: 'invalid', message: input.validationMessage };
    }
    if (this.currentStepKind === 'custom' && !input.customValid) {
      return { type: 'invalid', message: input.validationMessage };
    }

    const crossFieldError = this.validateStepFn?.(this.currentStepId, this.formValues);
    if (crossFieldError) {
      return { type: 'invalid', message: crossFieldError };
    }

    if (this.stepIndex >= this.activeStepIds.length - 1) {
      return { type: 'complete', values: { ...this.formValues } };
    }

    return { type: 'goto', stepId: this.activeStepIds[this.stepIndex + 1] };
  }

  async enterStep(stepId: T, prepareErrorMessage: string): Promise<FormStepperEnterResult> {
    if (this.prepareStepFn) {
      this.abort?.abort();
      const abort = new AbortController();
      this.abort = abort;
      const generation = ++this.prepareGeneration;
      this.preparing = true;
      try {
        await this.prepareStepFn(stepId, { ...this.formValues }, abort.signal);
        if (generation !== this.prepareGeneration) {
          return { ok: false, superseded: true };
        }
      } catch {
        if (generation !== this.prepareGeneration) {
          return { ok: false, superseded: true };
        }
        this.preparing = false;
        return { ok: false, error: prepareErrorMessage };
      } finally {
        if (generation === this.prepareGeneration) {
          this.preparing = false;
        }
      }
    }

    this.currentStepId = stepId;
    this.liveStepValues = {};
    return { ok: true };
  }

  cancelPreparation(): void {
    this.abort?.abort();
    this.abort = undefined;
    this.prepareGeneration += 1;
    this.preparing = false;
  }
}
