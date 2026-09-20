import { describe, expect, it, vi } from 'vitest';
import { createEditableMessageActionForm } from './create-editable-message-action-form.util.js';

describe('createEditableMessageActionForm', () => {
  it('builds an editable preview and submits the edited message', () => {
    const submit = vi.fn(() => ({ subscribe: vi.fn() }) as never);
    const config = createEditableMessageActionForm<{ name: string }>({
      title: entity => `Share ${entity.name}`,
      defaultMessage: entity => `Hello ${entity.name}`,
      submit,
    });
    const entity = { name: 'Team' };

    expect(config.defaultValues(entity, {
      refData: {},
      activeChip: '',
    })).toEqual({ message: 'Hello Team' });
    expect(config.buildForm?.(entity, {
      refData: {},
      values: {},
    }).fields[0]).toMatchObject({
      key: 'message',
      fieldType: 'textarea',
      mandatory: true,
    });

    const context = {
      entity,
      refData: {},
      values: { message: '  Edited message  ' },
      documents: [],
      customStepData: {},
      activeChip: '',
      permissions: {},
    };
    config.save(context);

    expect(submit).toHaveBeenCalledWith('Edited message', context);
  });

  it('rejects an empty message', () => {
    const config = createEditableMessageActionForm<{ id: string }>({
      title: 'Share',
      defaultMessage: () => '',
      submit: () => ({ subscribe: vi.fn() }) as never,
    });

    expect(config.validateBeforeSave?.({
      entity: { id: '1' },
      refData: {},
      values: { message: '  ' },
      documents: [],
      customStepData: {},
      activeChip: '',
      permissions: {},
    })).toBe('Enter a message to continue.');
  });
});
