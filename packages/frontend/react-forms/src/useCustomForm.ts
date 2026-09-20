'use client';

import { useCallback, useMemo, useState } from 'react';
import { FormEngine } from '@ssdev-toolkit/forms-core';
import type { CustomFieldValueParsed, FormValues } from '@ssdev-toolkit/forms-core';
import type { UseCustomFormOptions, UseCustomFormReturn } from './types.js';

export function useCustomForm({
  definition,
  initialValues,
  engineOptions,
}: UseCustomFormOptions): UseCustomFormReturn {
  const engine = useMemo(
    () => new FormEngine(definition, initialValues, engineOptions),
    [definition, initialValues, engineOptions],
  );

  const [, bump] = useState(0);
  const rerender = useCallback(() => bump((n) => n + 1), []);

  const values = engine.getValues();
  const resolvedFields = engine.getResolvedFields();
  const visibleFields = engine.getVisibleFields();
  const steps = engine.getSteps();
  const fieldErrors = engine.getFieldErrors();

  const setValue = useCallback(
    (key: string, value: CustomFieldValueParsed) => {
      engine.setValue(key, value);
      rerender();
    },
    [engine, rerender],
  );

  const setValues = useCallback(
    (partial: FormValues) => {
      engine.setValues(partial);
      rerender();
    },
    [engine, rerender],
  );

  const validate = useCallback(() => {
    const result = engine.validate();
    rerender();
    return result;
  }, [engine, rerender]);

  const reset = useCallback(
    (nextInitial?: FormValues) => {
      engine.reset(nextInitial);
      rerender();
    },
    [engine, rerender],
  );

  const getSubmitValues = useCallback((): FormValues => {
    const visibleKeys = new Set(engine.getVisibleFields().map((f) => f.definition.key));
    const all = engine.getValues();
    const out: FormValues = {};
    for (const [key, value] of Object.entries(all)) {
      if (visibleKeys.has(key)) out[key] = value;
    }
    return out;
  }, [engine]);

  return {
    values,
    resolvedFields,
    visibleFields,
    steps,
    fieldErrors,
    setValue,
    setValues,
    validate,
    reset,
    getSubmitValues,
  };
}
