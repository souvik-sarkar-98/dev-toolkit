import type { FormDefinition, FormEngineOptions, FormValues } from '@ssdev-toolkit/forms-core';

export interface CfFormStepperStep<T extends string = string> {
  id: T;
  label: string;
  kind: 'form' | 'custom';
}

export interface CfFormStepperStepChange<T extends string = string> {
  stepId: T;
  values: FormValues;
}

/** Live position of the stepper for hosts that render a pinned footer. */
export interface CfFormStepperState<T extends string = string> {
  stepId: T;
  stepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  /** True while {@link CfFormStepperPrepareStep} is resolving the next step. */
  preparing: boolean;
}

export type CfFormStepperBuildDefinition<T extends string = string> = (
  stepId: T,
  values: FormValues,
) => FormDefinition;

export type CfFormStepperResolveSteps<T extends string = string> = (
  values: FormValues,
) => T[];

export type CfFormStepperValidateStep<T extends string = string> = (
  stepId: T,
  values: FormValues,
) => string | undefined;

/**
 * Runs before a step is entered, so a step can load what its definition needs
 * (e.g. a form schema chosen on a previous step) instead of preloading everything.
 */
export type CfFormStepperPrepareStep<T extends string = string> = (
  stepId: T,
  values: FormValues,
) => Promise<void> | void;

export interface CfFormStepperCustomStepContext<T extends string = string> {
  stepId: T;
  values: FormValues;
}

export type CfFormStepperCustomStepValidator = () => boolean;
