import type { FormValues } from '../models/types.js';

/**
 * Accumulates wizard step values. Condition-hidden keys from the current step
 * are stripped so they never reach the completed payload.
 */
export function mergeStepValues(
  accumulated: FormValues,
  stepValues: FormValues,
  conditionHiddenKeys: readonly string[] = [],
): FormValues {
  const merged: FormValues = { ...accumulated, ...stepValues };
  for (const key of conditionHiddenKeys) {
    delete merged[key];
  }
  return merged;
}
