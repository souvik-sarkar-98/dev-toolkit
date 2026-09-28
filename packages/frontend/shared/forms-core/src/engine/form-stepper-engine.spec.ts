import { describe, expect, it } from 'vitest';
import { mergeStepValues } from './merge-step-values.js';
import { FormStepperEngine } from './form-stepper-engine.js';
import { getVisibleSubmitValues } from './submit-values.js';
import { FormEngine } from './form-engine-class.js';
import type { FormDefinition } from '../models/types.js';

const baseField = (
  key: string,
  extra: Partial<FormDefinition['fields'][number]> = {},
): FormDefinition['fields'][number] => ({
  id: key,
  key,
  label: key,
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
  ...extra,
});

describe('mergeStepValues', () => {
  it('keeps prior steps and drops current condition-hidden keys', () => {
    const merged = mergeStepValues(
      { donorId: 'd1', amount: 5 },
      { amount: 9, hidden: 'x' },
      ['hidden'],
    );
    expect(merged).toEqual({ donorId: 'd1', amount: 9 });
  });
});

describe('FormStepperEngine', () => {
  const steps = [
    { id: 'one', label: 'One', kind: 'form' as const },
    { id: 'two', label: 'Two', kind: 'form' as const },
  ];

  it('merges steps then completes with accumulated values', () => {
    const engine = new FormStepperEngine({ steps, initialValues: { a: 1 } });
    engine.mergeFormStep({ b: 2 }, []);
    const next = engine.requestNext({
      formValid: true,
      customValid: true,
      validationMessage: 'fill',
    });
    expect(next).toEqual({ type: 'goto', stepId: 'two' });
  });

  it('runs cross-step validation after merge', () => {
    const engine = new FormStepperEngine({
      steps,
      initialValues: {},
      validateStep: (_id, values) => (values.a === values.b ? 'duplicate' : undefined),
    });
    engine.mergeFormStep({ a: 'x', b: 'x' }, []);
    expect(
      engine.requestNext({ formValid: true, customValid: true, validationMessage: 'fill' }),
    ).toEqual({ type: 'invalid', message: 'duplicate' });
  });

  it('cancels superseded async prepare', async () => {
    let resolveFirst!: () => void;
    const first = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    let calls = 0;
    const engine = new FormStepperEngine({
      steps,
      prepareStep: async (stepId) => {
        calls += 1;
        if (stepId === 'two' && calls === 1) await first;
      },
    });
    const pending = engine.enterStep('two', 'failed');
    const second = engine.enterStep('two', 'failed');
    resolveFirst();
    const [firstResult, secondResult] = await Promise.all([pending, second]);
    expect(firstResult.ok === false || firstResult.ok === true).toBe(true);
    expect(secondResult).toEqual({ ok: true });
  });
});

describe('adapter parity: visible submit extraction', () => {
  it('React getSubmitValues and Angular FormEngineService share FormEngine.getSubmitValues', () => {
    const definition: FormDefinition = {
      id: 'p',
      key: 'p',
      label: 'p',
      description: null,
      fields: [
        baseField('shown'),
        baseField('hidden', {
          condition: { dependsOnKey: 'shown', operator: 'equals', value: 'yes' },
        }),
      ],
    };
    const engine = new FormEngine(definition, { shown: 'no', hidden: 'secret' });
    const fromEngine = engine.getSubmitValues();
    const fromHelper = getVisibleSubmitValues(engine.getValues(), engine.getVisibleFields());
    expect(fromEngine).toEqual({ shown: 'no' });
    expect(fromHelper).toEqual(fromEngine);
  });
});
