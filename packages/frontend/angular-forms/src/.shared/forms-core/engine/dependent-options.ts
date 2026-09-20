import type { DependentOptions, FieldOption } from '../models/types.js';

export function getDependentOptions(
  dependentOptions: DependentOptions,
  parentValue: string | null,
): FieldOption[] {
  if (parentValue === null || parentValue === undefined || parentValue === '') return [];
  const key = Array.isArray(parentValue) ? parentValue[0] : String(parentValue);
  return dependentOptions.optionMap[key] ?? [];
}
