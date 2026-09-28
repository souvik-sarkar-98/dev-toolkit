import type { InfiniteListPage, ListRowItem } from '../models/infinite-list.model.js';

export interface InfiniteListViewState<TItem = ListRowItem> {
  items: TItem[];
  pageIndex: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

export function beginInfiniteListLoad(
  state: InfiniteListViewState,
  append: boolean,
): InfiniteListViewState {
  if (append) {
    return { ...state, loadingMore: true };
  }
  return {
    ...state,
    loading: true,
    pageIndex: 0,
    hasMore: false,
  };
}

export function applyInfiniteListPage<TItem>(
  state: InfiniteListViewState<TItem>,
  page: InfiniteListPage<TItem>,
  append: boolean,
): InfiniteListViewState<TItem> {
  const loadedCount = (page.pageIndex + 1) * page.pageSize;
  return {
    items: append ? [...state.items, ...page.items] : page.items,
    pageIndex: page.pageIndex,
    hasMore: loadedCount < page.totalSize,
    loading: false,
    loadingMore: false,
  };
}

export function failInfiniteListLoad<TItem>(
  state: InfiniteListViewState<TItem>,
): InfiniteListViewState<TItem> {
  return { ...state, loading: false, loadingMore: false, hasMore: false };
}

export function canLoadMore(state: InfiniteListViewState): boolean {
  return !state.loading && !state.loadingMore && state.hasMore;
}

export class LoadGeneration {
  private current = 0;

  next(): number {
    this.current += 1;
    return this.current;
  }

  isCurrent(generation: number): boolean {
    return generation === this.current;
  }
}

export type DelayHandle = () => void;
export type DelayFn = (ms: number, callback: () => void) => DelayHandle;

export const defaultDelay: DelayFn = (ms, callback) => {
  const timer = setTimeout(callback, ms);
  return () => clearTimeout(timer);
};

export function createDebouncedRunner(delay: DelayFn = defaultDelay) {
  let cancel: DelayHandle | undefined;
  return (ms: number, run: () => void): void => {
    cancel?.();
    cancel = delay(ms, run);
  };
}
