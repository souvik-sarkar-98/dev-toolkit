import type { CustomFieldType, DateRangeValue } from '@ssdev-toolkit/forms-core';
import { isDateRangeValue, mergeDateRangePart } from '@ssdev-toolkit/forms-core';
import type { CustomFormClassNames, CustomFormComponents, FieldRenderProps } from './types.js';
import { renderPhoneFieldControl } from './phone-field.js';

function dateRangeValue(value: FieldRenderProps['value']): DateRangeValue {
  return isDateRangeValue(value) ? value : {};
}

function inputTypeForField(fieldType: CustomFieldType): string {
  switch (fieldType) {
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'password':
      return 'password';
    default:
      return 'text';
  }
}

function stringValue(value: FieldRenderProps['value']): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : '';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join(',');
  if (isDateRangeValue(value)) return '';
  return value;
}

export function createUnstyledComponents(
  classNames?: CustomFormClassNames,
): CustomFormComponents {
  const controlClass = classNames?.control;

  return {
    text: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="text"
        className={controlClass}
        value={stringValue(p.value)}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
        data-cf-type="text"
      />
    ),
    textarea: (p) => (
      <textarea
        id={p.id}
        name={p.name}
        className={controlClass}
        rows={4}
        value={stringValue(p.value)}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
        data-cf-type="textarea"
      />
    ),
    email: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="email"
        className={controlClass}
        value={stringValue(p.value)}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
        data-cf-type="email"
      />
    ),
    phone: (p) =>
      renderPhoneFieldControl(p, {
        group: classNames?.phoneGroup ?? classNames?.control,
        country: classNames?.phoneCountry,
        national: classNames?.phoneNational ?? classNames?.control,
      }),
    number: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="number"
        className={controlClass}
        value={stringValue(p.value)}
        onChange={(e) => {
          const v = e.target.value;
          p.onChange(v === '' ? '' : Number(v));
        }}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
        data-cf-type="number"
      />
    ),
    date: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="date"
        className={controlClass}
        value={stringValue(p.value)}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
        data-cf-type="date"
      />
    ),
    date_range: (p) => {
      const range = dateRangeValue(p.value);
      return (
        <div className={classNames?.phoneGroup} data-cf-type="date_range">
          <input
            id={`${p.id}-start`}
            name={`${p.name}-start`}
            type="date"
            className={controlClass}
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
            className={controlClass}
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
    boolean: (p) => (
      <input
        id={p.id}
        name={p.name}
        type="checkbox"
        className={controlClass}
        checked={Boolean(p.value)}
        onChange={(e) => p.onChange(e.target.checked)}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
        data-cf-type="boolean"
      />
    ),
    select: (p) => (
      <select
        id={p.id}
        name={p.name}
        className={controlClass}
        value={stringValue(p.value)}
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
    multiselect: (p) => (
      <select
        id={p.id}
        name={p.name}
        className={controlClass}
        multiple
        value={Array.isArray(p.value) ? p.value : []}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
          p.onChange(selected);
        }}
        onBlur={p.onBlur}
        disabled={p.disabled}
        aria-invalid={p.error ? true : undefined}
        data-cf-type="multiselect"
      >
        {p.field.availableOptions.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
  };
}

export type { CustomFormClassNames };
