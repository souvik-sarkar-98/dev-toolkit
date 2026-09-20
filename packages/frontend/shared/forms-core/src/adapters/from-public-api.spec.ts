import { describe, expect, it } from 'vitest';
import { fromPublicFormDefinition } from './from-public-api.js';

function definitionWith(field: Record<string, unknown>) {
  return fromPublicFormDefinition({
    id: 'form-1',
    key: 'CONTACT_REQUEST:request',
    label: 'Contact request',
    fields: [{ id: 'f1', key: 'email', label: 'Email', fieldType: 'email', ...field }],
  });
}

describe('fromPublicFormDefinition', () => {
  it('drops a condition that has no parent key', () => {
    const definition = definitionWith({ condition: {} });
    expect(definition.fields[0].condition).toBeNull();
  });

  it('keeps a condition that names a parent key', () => {
    const definition = definitionWith({
      condition: { dependsOnKey: 'type', operator: 'equals', value: 'A' },
    });
    expect(definition.fields[0].condition).toEqual({
      dependsOnKey: 'type',
      operator: 'equals',
      value: 'A',
    });
  });

  it('drops dependent options that have no parent key', () => {
    const definition = definitionWith({ dependentOptions: { optionMap: {} } });
    expect(definition.fields[0].dependentOptions).toBeNull();
  });
});
