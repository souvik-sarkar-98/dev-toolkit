import { describe, expect, it } from 'vitest';
import {
  applyInfiniteListPage,
  beginInfiniteListLoad,
  canLoadMore,
  LoadGeneration,
} from './list-page-state.js';
import { aliasPreparationTriggers, canonicalPreparationTrigger } from './preparation-triggers.js';
import { resolvePreparedFilterOptions } from './prepared-context.js';
import { classifyDashboardRun, decideActionFormSubmit, filterVisibleActions } from './list-actions.js';

describe('infinite list state', () => {
  it('applies pages and ignores stale generations', () => {
    const gen = new LoadGeneration();
    const first = gen.next();
    const second = gen.next();
    expect(gen.isCurrent(first)).toBe(false);
    expect(gen.isCurrent(second)).toBe(true);

    let state = beginInfiniteListLoad(
      { items: [], pageIndex: 0, hasMore: false, loading: false, loadingMore: false },
      false,
    );
    state = applyInfiniteListPage(
      state,
      { items: [{ id: '1', title: 'A' }], totalSize: 3, pageIndex: 0, pageSize: 2 },
      false,
    );
    expect(state.items).toHaveLength(1);
    expect(state.hasMore).toBe(true);
    expect(canLoadMore(state)).toBe(true);
  });
});

describe('preparation trigger aliases', () => {
  it('normalizes legacy trigger names', () => {
    expect(canonicalPreparationTrigger('list')).toBe('init');
    expect(canonicalPreparationTrigger('create')).toBe('createOpen');
    expect(canonicalPreparationTrigger('detail')).toBe('editPrepare');
    const aliased = aliasPreparationTriggers({ list: ['a'], create: ['b'] });
    expect(aliased.init).toEqual(['a']);
    expect(aliased.createOpen).toEqual(['b']);
  });
});

describe('prepared context', () => {
  it('reads generic filterOptions and falls back to donorOptions alias', () => {
    expect(resolvePreparedFilterOptions({ filterOptions: [{ key: '1', label: 'One' }] })).toEqual([
      { key: '1', label: 'One' },
    ]);
    expect(resolvePreparedFilterOptions({ donorOptions: [{ key: 'd', label: 'Donor' }] })).toEqual([
      { key: 'd', label: 'Donor' },
    ]);
  });
});

describe('dashboard actions', () => {
  it('classifies built-in runs and submit decisions', () => {
    expect(classifyDashboardRun('openCreate')).toBe('openCreate');
    expect(classifyDashboardRun('custom', 'form-1')).toBe('openActionForm');
    expect(decideActionFormSubmit({
      hasConfig: true,
      hasEntity: true,
      hasId: true,
      saving: false,
      validationError: 'need docs',
    })).toEqual({ type: 'invalid', message: 'need docs' });
  });

  it('filters actions by when()', () => {
    const visible = filterVisibleActions(
      [
        { id: 'a', label: 'A', run: 'openCreate' },
        { id: 'b', label: 'B', run: 'openCreate', when: () => false },
      ],
      {},
      'all',
      [],
    );
    expect(visible.map((action) => action.id)).toEqual(['a']);
  });
});
