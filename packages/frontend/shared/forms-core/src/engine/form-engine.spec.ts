import { describe, expect, it } from 'vitest';
import type { FormDefinition } from '../models/types.js';
import { FormEngine } from './form-engine-class.js';
import { resolveAllFields } from './form-engine.js';

describe('FormEngine dependent fields', () => {
  const definition: FormDefinition = {
    id: 'f1',
    key: 'f1',
    label: 'Test',
    description: null,
    fields: [
      {
        id: '1',
        key: 'parent',
        label: 'Parent',
        fieldType: 'select',
        mandatory: false,
        fieldOptions: [{ key: 'a', label: 'A' }],
        isHidden: false,
        isEncrypted: false,
        enabled: true,
        sortOrder: 1,
        condition: null,
        dependentOptions: null,
        validationRules: null,
      },
      {
        id: '2',
        key: 'child',
        label: 'Child',
        fieldType: 'select',
        mandatory: false,
        fieldOptions: [],
        isHidden: false,
        isEncrypted: false,
        enabled: true,
        sortOrder: 2,
        condition: null,
        dependentOptions: {
          dependsOnKey: 'parent',
          optionMap: {
            a: [{ key: 'x', label: 'X' }],
          },
        },
        validationRules: null,
      },
    ],
  };

  it('clears child when parent changes and option is invalid', () => {
    const engine = new FormEngine(definition, { parent: 'a', child: 'x' });
    engine.setValue('parent', '');
    expect(engine.getValues().child).toBe('');
  });

  it('preserves condition-hidden field values when parent changes', () => {
    const conditionalDef: FormDefinition = {
      id: 'f2',
      key: 'f2',
      label: 'Conditional',
      description: null,
      fields: [
        {
          id: '1',
          key: 'amount',
          label: 'Amount',
          fieldType: 'number',
          mandatory: true,
          fieldOptions: [],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 1,
          condition: { dependsOnKey: 'status', operator: 'not_equals', value: 'PAID' },
          dependentOptions: null,
          validationRules: null,
        },
        {
          id: '2',
          key: 'status',
          label: 'Status',
          fieldType: 'select',
          mandatory: true,
          fieldOptions: [
            { key: 'RAISED', label: 'Raised' },
            { key: 'PAID', label: 'Paid' },
          ],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 2,
          condition: null,
          dependentOptions: null,
          validationRules: null,
        },
        {
          id: '3',
          key: 'paidOn',
          label: 'Paid on',
          fieldType: 'date',
          mandatory: true,
          fieldOptions: [],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 3,
          condition: { dependsOnKey: 'status', operator: 'equals', value: 'PAID' },
          dependentOptions: null,
          validationRules: null,
        },
      ],
    };

    const engine = new FormEngine(conditionalDef, { amount: 500, status: 'RAISED' });
    engine.setValue('status', 'PAID');

    expect(engine.getValues().amount).toBe(500);
    expect(engine.getVisibleFields().map((field) => field.definition.key)).toEqual([
      'status',
      'paidOn',
    ]);
  });

  it('hides a child when its parent is hidden by an unmet condition', () => {
    const chainedDef: FormDefinition = {
      id: 'f4',
      key: 'f4',
      label: 'Chained conditions',
      description: null,
      fields: [
        {
          id: '1',
          key: 'type',
          label: 'Type',
          fieldType: 'select',
          mandatory: true,
          fieldOptions: [
            { key: 'ONETIME', label: 'One time' },
            { key: 'REGULAR', label: 'Regular' },
          ],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 1,
          condition: null,
          dependentOptions: null,
          validationRules: null,
        },
        {
          id: '2',
          key: 'donationFor',
          label: 'For an event?',
          fieldType: 'select',
          mandatory: true,
          fieldOptions: [
            { key: 'PROJECT', label: 'Yes' },
            { key: 'GENERAL', label: 'No' },
          ],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 2,
          condition: { dependsOnKey: 'type', operator: 'equals', value: 'ONETIME' },
          dependentOptions: null,
          validationRules: null,
        },
        {
          id: '3',
          key: 'forEventId',
          label: 'Event',
          fieldType: 'select',
          mandatory: true,
          fieldOptions: [{ key: 'event-1', label: 'Event 1' }],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 3,
          condition: { dependsOnKey: 'donationFor', operator: 'equals', value: 'PROJECT' },
          dependentOptions: null,
          validationRules: null,
        },
      ],
    };

    const engine = new FormEngine(chainedDef, {
      type: 'ONETIME',
      donationFor: 'PROJECT',
      forEventId: 'event-1',
    });
    expect(engine.getVisibleFields().map((field) => field.definition.key)).toEqual([
      'type',
      'donationFor',
      'forEventId',
    ]);

    engine.setValue('type', 'REGULAR');

    expect(engine.getVisibleFields().map((field) => field.definition.key)).toEqual(['type']);
    expect(engine.getConditionHiddenKeys()).toEqual(['donationFor', 'forEventId']);
  });

  it('rejects future dates when dateConstraints disallowFuture is set', () => {
    const dateDef: FormDefinition = {
      id: 'f3',
      key: 'f3',
      label: 'Date bounds',
      description: null,
      fields: [
        {
          id: '1',
          key: 'paidOn',
          label: 'Paid on',
          fieldType: 'date',
          mandatory: true,
          fieldOptions: [],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 1,
          condition: null,
          dependentOptions: null,
          validationRules: null,
          dateConstraints: { max: { kind: 'today' } },
        },
      ],
    };

    const engine = new FormEngine(dateDef, { paidOn: '2099-01-01' });
    const result = engine.validate();
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.paidOn).toContain('Paid on must be on or before');
  });

  it('exposes fieldOptions as availableOptions for autocomplete fields', () => {
    const autocompleteDef: FormDefinition = {
      id: 'f4',
      key: 'f4',
      label: 'Autocomplete',
      description: null,
      fields: [
        {
          id: '1',
          key: 'memberId',
          label: 'Donor Name',
          fieldType: 'autocomplete',
          mandatory: false,
          fieldOptions: [
            { key: 'donor-1', label: 'Priya Sharma' },
            { key: 'donor-2', label: 'Rahul Mehta' },
          ],
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

    const [field] = resolveAllFields(autocompleteDef, {});
    expect(field.availableOptions).toEqual([
      { key: 'donor-1', label: 'Priya Sharma' },
      { key: 'donor-2', label: 'Rahul Mehta' },
    ]);
  });

  it('resolves fieldOptions when provided as a function of form values', () => {
    const dynamicDef: FormDefinition = {
      id: 'f5',
      key: 'f5',
      label: 'Dynamic options',
      description: null,
      fields: [
        {
          id: '1',
          key: 'mode',
          label: 'Mode',
          fieldType: 'select',
          mandatory: false,
          fieldOptions: [
            { key: 'GENERAL', label: 'General' },
            { key: 'PROJECT', label: 'Project' },
          ],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 1,
          condition: null,
          dependentOptions: null,
          validationRules: null,
        },
        {
          id: '2',
          key: 'eventId',
          label: 'Event',
          fieldType: 'select',
          mandatory: false,
          fieldOptions: values => (
            values['mode'] === 'PROJECT'
              ? [{ key: 'evt-1', label: 'Food drive' }]
              : []
          ),
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 2,
          condition: null,
          dependentOptions: null,
          validationRules: null,
        },
      ],
    };

    const general = resolveAllFields(dynamicDef, { mode: 'GENERAL' });
    expect(general.find(field => field.definition.key === 'eventId')?.availableOptions).toEqual([]);

    const project = resolveAllFields(dynamicDef, { mode: 'PROJECT' });
    expect(project.find(field => field.definition.key === 'eventId')?.availableOptions).toEqual([
      { key: 'evt-1', label: 'Food drive' },
    ]);
  });

  it('resolves dependentOptions from initial values not declared on the current step', () => {
    const stepTwoDef: FormDefinition = {
      id: 'step-2',
      key: 'step-2',
      label: 'Step 2',
      description: null,
      fields: [
        {
          id: '1',
          key: 'type',
          label: 'Donation type',
          fieldType: 'select',
          mandatory: true,
          fieldOptions: [],
          isHidden: false,
          isEncrypted: false,
          enabled: true,
          sortOrder: 1,
          condition: null,
          dependentOptions: {
            dependsOnKey: 'donorId',
            optionMap: {
              'donor-1': [{ key: 'ONETIME', label: 'One-time' }],
            },
          },
          validationRules: null,
        },
      ],
    };

    const engine = new FormEngine(stepTwoDef, {
      donorId: 'donor-1',
      type: null,
    });
    const [typeField] = resolveAllFields(stepTwoDef, engine.getValues());
    expect(typeField.availableOptions).toEqual([{ key: 'ONETIME', label: 'One-time' }]);
  });
});
