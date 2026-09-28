'use client';

import { useCallback, useMemo, useState } from 'react';
import type { FormValues } from '@ssdev-toolkit/forms-core';
import {
  FormStepperEngine,
  type FormStepperBuildDefinition,
  type FormStepperEngineOptions,
  type FormStepperPrepareStep,
  type FormStepperResolveSteps,
  type FormStepperState,
  type FormStepperStep,
  type FormStepperValidateStep,
} from '@ssdev-toolkit/forms-core';

export interface UseFormStepperOptions<T extends string = string> extends FormStepperEngineOptions<T> {
  buildStepDefinition: FormStepperBuildDefinition<T>;
  validationErrorMessage?: string;
  prepareStepErrorMessage?: string;
}

export function useFormStepper<T extends string = string>(options: UseFormStepperOptions<T>) {
  const {
    steps,
    resolveSteps,
    validateStep,
    prepareStep,
    initialValues,
    buildStepDefinition,
    validationErrorMessage = 'Please fill all required fields before continuing.',
    prepareStepErrorMessage = 'Could not load the next step. Please try again.',
  } = options;

  const engine = useMemo(
    () =>
      new FormStepperEngine<T>({
        steps,
        resolveSteps,
        validateStep,
        prepareStep,
        initialValues,
      }),
    [steps, resolveSteps, validateStep, prepareStep, initialValues],
  );

  const [, bump] = useState(0);
  const rerender = useCallback(() => bump((n) => n + 1), []);
  const state: FormStepperState<T> = engine.getState();
  const definition = buildStepDefinition(state.stepId, engine.getValues());

  const goTo = useCallback(
    async (stepId: T) => {
      const entered = await engine.enterStep(stepId, prepareStepErrorMessage);
      rerender();
      return entered;
    },
    [engine, prepareStepErrorMessage, rerender],
  );

  const next = useCallback(
    async (input: { formValid: boolean; customValid?: boolean; stepValues?: FormValues; hiddenKeys?: string[] }) => {
      if (engine.currentStepKind === 'form' && input.stepValues) {
        engine.mergeFormStep(input.stepValues, input.hiddenKeys ?? []);
      }
      const result = engine.requestNext({
        formValid: input.formValid,
        customValid: input.customValid ?? true,
        validationMessage: validationErrorMessage,
      });
      if (result.type === 'goto') {
        return goTo(result.stepId);
      }
      rerender();
      return result;
    },
    [engine, goTo, rerender, validationErrorMessage],
  );

  return {
    engine,
    state,
    definition,
    values: engine.getValues(),
    next,
    back: () => engine.requestBack(),
    goTo,
  };
}

export type {
  FormStepperStep,
  FormStepperPrepareStep,
  FormStepperResolveSteps,
  FormStepperValidateStep,
  FormStepperBuildDefinition,
};
