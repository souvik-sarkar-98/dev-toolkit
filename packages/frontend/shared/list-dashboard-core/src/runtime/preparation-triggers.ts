import type { ListPreparationTrigger } from './list-preparation.runtime.js';

export function canonicalPreparationTrigger(
  trigger: ListPreparationTrigger,
): ListPreparationTrigger {
  switch (trigger) {
    case 'list':
      return 'init';
    case 'create':
      return 'createOpen';
    case 'detail':
    case 'bulkEdit':
      return 'editPrepare';
    default:
      return trigger;
  }
}

export function aliasPreparationTriggers(
  triggers: Partial<Record<ListPreparationTrigger, string[]>> | undefined,
): Partial<Record<ListPreparationTrigger, string[]>> {
  const next = { ...(triggers ?? {}) };
  next.init ??= next.list;
  next.createOpen ??= next.create;
  next.editPrepare ??= mergeTriggerIds(next.detail, next.bulkEdit);
  return next;
}

export function mergeTriggerIds(
  first: string[] | undefined,
  second: string[] | undefined,
): string[] | undefined {
  return first || second ? [...new Set([...(first ?? []), ...(second ?? [])])] : undefined;
}
