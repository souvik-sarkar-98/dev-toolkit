import { describe, expect, it, vi } from 'vitest';
import { deriveBulkEditHooksFromDetailEdit } from './derive-bulk-edit-from-detail-edit.util.js';
import type { ListDetailEditPageConfig } from '../config/list-detail-page.config.js';

describe('deriveBulkEditHooksFromDetailEdit', () => {
  it('maps detail edit hooks to bulk edit shape', () => {
    const edit: ListDetailEditPageConfig<{ id: string }> = {
      documentTypes: ['pdf'],
      lockedFields: ['amount'],
      entityToEditValues: entity => ({ id: entity.id }),
      buildEditSummary: () => [],
      buildEditForm: () => ({
        id: 'edit',
        key: 'edit',
        label: 'Edit',
        description: null,
        fields: [],
      }),
      save: () => ({ subscribe: vi.fn() }) as never,
      validateBeforeSave: ({ values }) =>
        values['amount'] ? undefined : 'Amount required',
    };

    const hooks = deriveBulkEditHooksFromDetailEdit(edit);
    expect(hooks.documentTypes).toEqual(['pdf']);
    expect(hooks.lockedFields).toEqual(['amount']);
    expect(hooks.entityToEditValues({ id: '1' })).toEqual({ id: '1' });
    expect(hooks.validateBeforeSave?.({ id: '1' }, {}, [])).toBe('Amount required');
  });
});
