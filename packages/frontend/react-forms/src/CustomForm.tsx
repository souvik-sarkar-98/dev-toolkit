'use client';

import { useState, type FormEvent } from 'react';
import type { FormValues } from '@ssdev-toolkit/forms-core';
import type { CustomFormProps } from './types.js';
import { useCustomForm } from './useCustomForm.js';
import { mergeComponents, renderFieldControl, wrapFieldLayout } from './registry.js';
import { createUnstyledComponents } from './unstyled.js';

export function CustomForm({
  definition,
  initialValues,
  engineOptions,
  components,
  classNames,
  idPrefix = 'cf',
  disabled = false,
  hideHeading = false,
  submitLabel = 'Submit',
  onSubmit,
  renderStep,
}: CustomFormProps) {
  const form = useCustomForm({ definition, initialValues, engineOptions });
  const [submitting, setSubmitting] = useState(false);
  const merged = mergeComponents(createUnstyledComponents(classNames), components);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = form.validate();
    if (!result.valid) return;
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(form.getSubmitValues());
      form.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const renderFields = (fields: typeof form.visibleFields) =>
    fields.map((field) => {
      const key = field.definition.key;
      const id = `${idPrefix}-${key}`;
      const props = {
        field,
        id,
        name: key,
        value: form.values[key] ?? null,
        onChange: (value: FormValues[string]) => form.setValue(key, value),
        disabled,
        error: form.fieldErrors[key],
        engineOptions,
      };
      const control = renderFieldControl(props, merged);
      return (
        <div key={field.definition.id}>
          {wrapFieldLayout(props, control, classNames)}
        </div>
      );
    });

  const stepsContent = form.steps.map((step) => {
    const fieldsNode = renderFields(step.fields);
    if (renderStep) return renderStep(step, () => fieldsNode);
    return (
      <div key={step.stepId || 'default'} data-cf-step={step.stepId || undefined}>
        {step.stepName && <h4>{step.stepName}</h4>}
        {fieldsNode}
      </div>
    );
  });

  return (
    <form
      className={classNames?.root}
      onSubmit={handleSubmit}
      noValidate
      data-cf-form={definition.key}
    >
      {!hideHeading && definition.label && (
        <h3 className={classNames?.heading}>{definition.label}</h3>
      )}
      {!hideHeading && definition.description && (
        <p className={classNames?.description}>{definition.description}</p>
      )}
      {stepsContent}
      {onSubmit && (
        <button type="submit" className={classNames?.submit} disabled={disabled || submitting}>
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      )}
    </form>
  );
}
