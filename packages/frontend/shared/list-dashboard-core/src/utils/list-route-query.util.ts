/** Parse comma-separated query values (e.g. `?status=RAISED,PENDING`). */
export function parseCsvQueryParam(value: string | null | undefined): string[] | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const items = value.split(',').map(item => item.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Serialize string arrays for URL query params; empty → omit (`null`). */
export function formatCsvQueryParam(values: string[] | undefined): string | null {
  if (!values?.length) {
    return null;
  }
  return values.join(',');
}

export function parseStringQueryParam(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function parseBooleanQueryParam(value: string | null | undefined): boolean {
  return value === 'true' || value === '1';
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index]);
  }
  return false;
}
