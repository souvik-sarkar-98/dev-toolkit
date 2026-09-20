/** Raw field values as persisted (PostgreSQL `text[]`). Empty = cleared / null. */
export type FormFieldStoredValue = string[];

export function isStoredValueEmpty(value: FormFieldStoredValue): boolean {
  return value.length === 0;
}

export function storedValuesEqual(a: FormFieldStoredValue, b: FormFieldStoredValue): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, index) => entry === b[index]);
}
