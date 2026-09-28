export interface PreparedFilterOption {
  key: string;
  label: string;
}

export interface ListPreparedContextBindings {
  /** Context key holding filter field options after preparation. Default: `filterOptions`. */
  filterOptionsKey?: string;
  /** Context key merged into create context. Default: `createOptions`. */
  createOptionsKey?: string;
}

const DEFAULT_FILTER_KEYS = ['filterOptions', 'donorOptions'] as const;

export function resolvePreparedFilterOptions(
  context: unknown,
  bindings?: ListPreparedContextBindings,
): PreparedFilterOption[] | undefined {
  if (!context || typeof context !== 'object') return undefined;
  const record = context as Record<string, unknown>;
  const keys = bindings?.filterOptionsKey
    ? [bindings.filterOptionsKey]
    : [...DEFAULT_FILTER_KEYS];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value as PreparedFilterOption[];
    }
  }
  return undefined;
}

export function resolvePreparedCreateOptions(
  context: unknown,
  bindings?: ListPreparedContextBindings,
): Record<string, unknown> | undefined {
  if (!context || typeof context !== 'object') return undefined;
  const key = bindings?.createOptionsKey ?? 'createOptions';
  const value = (context as Record<string, unknown>)[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
