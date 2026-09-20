import { describe, expect, it, vi } from 'vitest';
import type { FormDefinition } from '@ssdev-toolkit/forms-core';
import {
  ListFormResolutionError,
  ListFormResolver,
  mergeListForms,
  resolveListForm,
} from './list-form.runtime.js';

const localForm: FormDefinition = {
  id: 'local',
  key: 'profile',
  label: 'Local profile',
  description: null,
  fields: [
    {
      id: 'name-local',
      key: 'name',
      label: 'Local name',
      fieldType: 'text',
      mandatory: false,
      fieldOptions: [],
      isHidden: false,
      isEncrypted: false,
      enabled: true,
      sortOrder: 1,
      condition: null,
      dependentOptions: null,
      validationRules: null,
    },
  ],
};

const backendPayload = {
  id: 'backend',
  key: 'profile',
  label: 'Backend profile',
  fields: [
    {
      id: 'name-backend',
      key: 'name',
      label: 'Backend name',
      fieldType: 'text',
    },
    {
      id: 'email',
      key: 'email',
      label: 'Email',
      fieldType: 'email',
    },
  ],
};

const context = { dashboardId: 'members', experienceId: 'members' };

describe('list form sources', () => {
  it('resolves local definitions', async () => {
    const result = await resolveListForm(
      { kind: 'local', definition: localForm },
      context,
    );

    expect(result.source).toBe('local');
    expect(result.definition).toBe(localForm);
  });

  it('builds local definitions with the complete framework-neutral context', async () => {
    const build = vi.fn(() => localForm);
    const richContext = {
      ...context,
      slot: 'create',
      chip: 'active',
      entity: { id: 'm1' },
      refData: { roles: [] },
      presets: { invited: true },
      values: { name: 'Nabarun' },
      asyncOptions: { member: [{ key: 'm1', label: 'Member' }] },
    };

    await resolveListForm({ kind: 'local', build }, richContext);
    expect(build).toHaveBeenCalledWith(richContext);
  });

  it('maps backend definitions with the public form adapter by default', async () => {
    const result = await resolveListForm(
      { kind: 'backend', load: async () => backendPayload },
      context,
    );

    expect(result.definition.id).toBe('backend');
    expect(result.definition.fields.map(field => field.key)).toEqual([
      'name',
      'email',
    ]);
  });

  it('merges hybrid backend fields over local fields', async () => {
    const result = await resolveListForm(
      {
        kind: 'hybrid',
        local: localForm,
        load: async () => backendPayload,
      },
      context,
    );

    expect(result.definition.label).toBe('Backend profile');
    expect(result.definition.fields[0].label).toBe('Backend name');
    expect(result.definition.fields.map(field => field.key)).toEqual([
      'name',
      'email',
    ]);
    expect(mergeListForms(localForm, result.definition).fields).toHaveLength(2);
  });

  it('resolves an observable backend envelope and preserves metadata', async () => {
    const result = await resolveListForm(
      {
        kind: 'backend',
        load: () => ({
          subscribe: observer => {
            if (typeof observer !== 'function') {
              observer.next?.({
                definition: backendPayload,
                version: 7,
                metadata: { etag: 'abc' },
              });
              observer.complete?.();
            }
          },
        }),
      },
      context,
    );

    expect(result.definition.id).toBe('backend');
    expect(result.version).toBe(7);
    expect(result.metadata).toEqual({ etag: 'abc' });
  });

  it('enriches a resolved hybrid base source', async () => {
    const result = await resolveListForm(
      {
        kind: 'hybrid',
        base: { kind: 'local', definition: localForm },
        enrich: (definition, formContext) => ({
          ...definition,
          fields: definition.fields.map(field => ({
            ...field,
            readOnly: formContext.slot === 'edit',
          })),
        }),
      },
      { ...context, slot: 'edit' },
    );

    expect(result.definition.fields[0].readOnly).toBe(true);
  });

  it('rejects empty and invalid backend definitions with explicit errors', async () => {
    await expect(resolveListForm(
      { kind: 'backend', load: async () => null },
      context,
    )).rejects.toMatchObject({
      name: 'ListFormResolutionError',
      code: 'empty-backend-result',
    });

    await expect(resolveListForm(
      { kind: 'backend', load: async () => ({ fields: [] }) },
      context,
    )).rejects.toMatchObject({
      code: 'invalid-definition',
    });
  });
});

describe('ListFormResolver cache', () => {
  it('deduplicates concurrent loads and supports targeted invalidation', async () => {
    const load = vi.fn(async () => backendPayload);
    const source = { kind: 'backend' as const, load };
    const resolver = new ListFormResolver();

    const [first, second] = await Promise.all([
      resolver.resolve('create', source, context),
      resolver.resolve('create', source, context),
    ]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);

    resolver.invalidate('create');
    await resolver.resolve('create', source, context);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps caches isolated between resolver instances', async () => {
    const load = vi.fn(async () => backendPayload);
    const source = { kind: 'backend' as const, load };

    await Promise.all([
      new ListFormResolver().resolve('create', source, context),
      new ListFormResolver().resolve('create', source, context),
    ]);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not repopulate an invalidated in-flight entry', async () => {
    let release!: () => void;
    const firstLoad = new Promise<void>(resolve => {
      release = resolve;
    });
    const load = vi.fn(async () => {
      if (load.mock.calls.length === 1) await firstLoad;
      return backendPayload;
    });
    const source = { kind: 'backend' as const, load };
    const resolver = new ListFormResolver();

    const stale = resolver.resolve('create', source, context);
    resolver.invalidate('create');
    const fresh = resolver.resolve('create', source, context);
    release();
    await Promise.all([stale, fresh]);
    await resolver.resolve('create', source, context);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
