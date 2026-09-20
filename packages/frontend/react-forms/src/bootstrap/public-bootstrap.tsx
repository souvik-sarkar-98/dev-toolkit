'use client';

import { isDateRangeValue, mergeDateRangePart } from '@ssdev-toolkit/forms-core';
import { createUnstyledComponents } from '../unstyled.js';
import { renderPhoneFieldControl } from '../phone-field.js';
import type { CustomFormClassNames, CustomFormComponents } from '../types.js';

export const publicFormClassNames: CustomFormClassNames = {
  root: 'dynamic-form',
  field: 'mb-3',
  label: 'form-label',
  error: 'invalid-feedback d-block',
  requiredMark: 'text-danger ms-1',
  submit: 'btn btn-primary',
  heading: 'h5 mb-3',
  description: 'text-muted mb-4',
  phoneGroup: 'cf-phone-input-group',
  phoneCountry: 'form-select cf-phone-country',
  phoneNational: 'form-control cf-phone-national',
};

export function createPublicBootstrapFormComponents(): CustomFormComponents {
  const base = createUnstyledComponents(publicFormClassNames);

  return {
    ...base,
    select: (p) => (
      <select
        id={p.id}
        name={p.name}
        className={`form-select${p.error ? ' is-invalid' : ''}`}
        value={typeof p.value === 'string' ? p.value : ''}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
        data-cf-type="select"
      >
        <option value="">Select…</option>
        {p.field.availableOptions.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
    boolean: (p) => (
      <div className="form-check">
        <input
          id={p.id}
          name={p.name}
          type="checkbox"
          className={`form-check-input${p.error ? ' is-invalid' : ''}`}
          checked={Boolean(p.value)}
          onChange={(e) => p.onChange(e.target.checked)}
          onBlur={p.onBlur}
          disabled={p.disabled}
          aria-invalid={p.error ? true : undefined}
          data-cf-type="boolean"
        />
      </div>
    ),
    text: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="text"
        className={`form-control${p.error ? ' is-invalid' : ''}`}
        value={typeof p.value === 'string' ? p.value : ''}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
      />
    ),
    textarea: (p) => (
      <textarea
        id={p.id}
        name={p.name}
        className={`form-control${p.error ? ' is-invalid' : ''}`}
        rows={4}
        value={typeof p.value === 'string' ? p.value : ''}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
      />
    ),
    email: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="email"
        className={`form-control${p.error ? ' is-invalid' : ''}`}
        value={typeof p.value === 'string' ? p.value : ''}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
      />
    ),
    phone: (p) => {
      const invalid = p.error ? ' is-invalid' : '';
      const multiCountry = (p.engineOptions?.phoneCountryCodes?.length ?? 0) > 1;
      return renderPhoneFieldControl(p, {
        group: `cf-phone-input-group${invalid}`,
        country: multiCountry
          ? `form-select cf-phone-country${invalid}`
          : `cf-phone-country-static${invalid}`,
        national: `form-control cf-phone-national${invalid}`,
      });
    },
    number: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="number"
        className={`form-control${p.error ? ' is-invalid' : ''}`}
        value={p.value === '' || p.value === null ? '' : String(p.value)}
        onChange={(e) => {
          const v = e.target.value;
          p.onChange(v === '' ? '' : Number(v));
        }}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
      />
    ),
    date: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="date"
        className={`form-control${p.error ? ' is-invalid' : ''}`}
        value={typeof p.value === 'string' ? p.value : ''}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
      />
    ),
    date_range: (p) => {
      const range = isDateRangeValue(p.value) ? p.value : {};
      return (
        <div className="d-flex gap-2" data-cf-type="date_range">
          <input
            id={`${p.id}-start`}
            name={`${p.name}-start`}
            type="date"
            className={`form-control${p.error ? ' is-invalid' : ''}`}
            value={range.startDate ?? ''}
            onChange={(e) =>
              p.onChange(mergeDateRangePart(range, { startDate: e.target.value || undefined }))
            }
            onBlur={p.onBlur}
            disabled={p.disabled}
            aria-invalid={p.error ? true : undefined}
            aria-label="Start date"
          />
          <input
            id={`${p.id}-end`}
            name={`${p.name}-end`}
            type="date"
            className={`form-control${p.error ? ' is-invalid' : ''}`}
            value={range.endDate ?? ''}
            onChange={(e) =>
              p.onChange(mergeDateRangePart(range, { endDate: e.target.value || undefined }))
            }
            onBlur={p.onBlur}
            disabled={p.disabled}
            aria-invalid={p.error ? true : undefined}
            aria-label="End date"
          />
        </div>
      );
    },
  };
}
