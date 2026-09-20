export interface ChipFilter {
  id: string;
  label: string;
  hidden?: boolean;
}

export interface ListRowBadge {
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export type ListRowIconTone = 'orange' | 'blue' | 'green' | 'red' | 'amber' | 'indigo' | 'neutral';

/** Structured subtitle segment — use instead of plain `subtitle` when links or emphasis are needed. */
export interface ListRowSubtitlePart {
  text: string;
  /** Renders with stronger weight (e.g. donation type). */
  emphasis?: boolean;
  /** When set, segment is clickable and emits `rowLinkClick` with this id. */
  linkId?: string;
}

export interface ListRowItem<TPayload = unknown> {
  id: string;
  title: string;
  subtitle?: string;
  subtitleParts?: ListRowSubtitlePart[];
  subtitleSeparator?: string;
  metaLeft?: string;
  metaRight?: string;
  badge?: ListRowBadge;
  icon?: string;
  iconTone?: ListRowIconTone;
  avatarUrl?: string;
  avatarInitials?: string;
  payload?: TPayload;
}

export interface InfiniteListPage<T = ListRowItem> {
  items: T[];
  totalSize: number;
  pageIndex: number;
  pageSize: number;
}

export interface InfiniteListLoadRequest {
  chipId: string;
  pageIndex: number;
  pageSize: number;
  append: boolean;
}

export interface ListFilterCriteria {
  [key: string]: unknown;
}

export interface AppliedListFilter {
  id: string;
  label: string;
}

export interface InfiniteListQuery {
  chipId: string;
  pageIndex: number;
  pageSize: number;
  append: boolean;
  criteria: ListFilterCriteria;
  searchText?: string;
}

/** @deprecated Prefer passing `definition` + `initialValues` directly to {@link ListFilterSheetComponent}. */
export interface ListFilterSheetSection {
  id: string;
  title: string;
  hidden?: boolean;
}
