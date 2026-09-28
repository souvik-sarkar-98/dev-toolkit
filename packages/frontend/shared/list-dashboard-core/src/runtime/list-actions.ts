import type { ListActionDef, ListActionRunTarget } from '../config/list-dashboard.config.js';
import type { FilteredListDashboardPermissions } from '../config/filtered-list-dashboard.config.js';

export function filterVisibleActions(
  actions: ListActionDef[] | undefined,
  permissions: FilteredListDashboardPermissions,
  chipId: string,
  selection: unknown[],
  entity?: unknown,
): ListActionDef[] {
  return (actions ?? []).filter(
    (action) =>
      !action.when
      || action.when({ permissions, activeChip: chipId, selection, entity }),
  );
}

export type DashboardRunKind =
  | 'openActionForm'
  | 'openCreate'
  | 'openBulkEdit'
  | 'enterEdit'
  | 'openDetail'
  | 'openDetailEdit'
  | 'customOperation';

export function classifyDashboardRun(
  run: ListActionRunTarget,
  actionFormId?: string,
): DashboardRunKind {
  if (actionFormId) return 'openActionForm';
  switch (run) {
    case 'openCreate':
      return 'openCreate';
    case 'openBulkEdit':
      return 'openBulkEdit';
    case 'enterEdit':
      return 'enterEdit';
    case 'openDetail':
      return 'openDetail';
    case 'openDetailEdit':
      return 'openDetailEdit';
    default:
      return 'customOperation';
  }
}

export function decideActionFormSubmit(input: {
  hasConfig: boolean;
  hasEntity: boolean;
  hasId: boolean;
  saving: boolean;
  validationError?: string;
}): { type: 'skip' } | { type: 'invalid'; message: string } | { type: 'save' } {
  if (!input.hasConfig || !input.hasEntity || !input.hasId || input.saving) {
    return { type: 'skip' };
  }
  if (input.validationError) {
    return { type: 'invalid', message: input.validationError };
  }
  return { type: 'save' };
}
