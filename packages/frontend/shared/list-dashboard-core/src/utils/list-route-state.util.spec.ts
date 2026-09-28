import { describe, expect, it } from 'vitest';
import { ListRouteStateSync } from './list-route-state.util.js';

function params(map: Record<string, string | null>) {
  return { get: (name: string) => map[name] ?? null };
}

describe('ListRouteStateSync', () => {
  const sync = new ListRouteStateSync(
    { defaultChip: 'all', normalize: chip => chip || undefined },
    [
      { param: 'status', criteriaKey: 'status', type: 'csv' },
      { param: 'q', criteriaKey: 'search', type: 'string' },
      { param: 'mine', criteriaKey: 'mine', type: 'boolean' },
    ],
  );

  it('parses chip and typed filters without a router', () => {
    expect(sync.readFromParams(params({ chip: 'open', status: 'A,B', q: 'x', mine: 'true' }))).toEqual({
      chip: 'open',
      filters: { status: ['A', 'B'], search: 'x', mine: true },
    });
  });

  it('formats query params and omits the default chip', () => {
    expect(sync.buildQueryParams('all', { status: ['A'], search: 'x', mine: true })).toEqual({
      chip: null,
      status: 'A',
      q: 'x',
      mine: true,
    });
  });

  it('merges route filters onto criteria', () => {
    const merged = sync.mergeFiltersIntoCriteria({ status: ['Z'], extra: 1 }, { status: ['A'] });
    expect(merged).toEqual({ extra: 1, status: ['A'] });
  });
});
