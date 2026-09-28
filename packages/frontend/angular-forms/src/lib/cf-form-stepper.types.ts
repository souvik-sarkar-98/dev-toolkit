export type {
  FormStepperStep as CfFormStepperStep,
  FormStepperStepChange as CfFormStepperStepChange,
  FormStepperState as CfFormStepperState,
  FormStepperBuildDefinition as CfFormStepperBuildDefinition,
  FormStepperResolveSteps as CfFormStepperResolveSteps,
  FormStepperValidateStep as CfFormStepperValidateStep,
  FormStepperPrepareStep as CfFormStepperPrepareStep,
  FormStepperCustomStepValidator as CfFormStepperCustomStepValidator,
} from '@ssdev-toolkit/forms-core';

import type { FormValues } from '@ssdev-toolkit/forms-core';

/** @deprecated Use FormStepper types from `@ssdev-toolkit/forms-core`. */
export interface CfFormStepperCustomStepContext<T extends string = string> {
  stepId: T;
  values: FormValues;
}
