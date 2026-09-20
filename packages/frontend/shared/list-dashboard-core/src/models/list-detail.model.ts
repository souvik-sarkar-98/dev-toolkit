import type { ListDocument } from '../types/documents.js';

export type ListDetailFieldFormat = 'text' | 'html';

export interface ListDetailField {
  label: string;
  value: string;
  /** When `html`, value is sanitized and rendered as HTML (links, emphasis, etc.). Default: `text`. */
  format?: ListDetailFieldFormat;
}

export interface ListDetailKeyValueSection {
  type: 'key_value';
  id: string;
  title: string;
  fields: ListDetailField[];
  collapsed?: boolean;
}

export interface ListDetailDocumentsSection {
  type: 'documents';
  id: string;
  title: string;
  documents: ListDocument[];
  loading?: boolean;
}

/** Full-width sanitized HTML block (instructions, notices, links). */
export interface ListDetailContentSection {
  type: 'content';
  id: string;
  html: string;
  title?: string;
  collapsed?: boolean;
}

export interface ListDetailItemListItem {
  id?: string;
  title: string;
  subtitle?: string;
  metaLeft?: string;
  metaRight?: string;
  badge?: { label: string; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' };
}

/** Nested collection section (expense items, UPI details, etc.). */
export interface ListDetailItemListSection {
  type: 'item_list';
  id: string;
  title: string;
  items: ListDetailItemListItem[];
  emptyMessage?: string;
  collapsed?: boolean;
  loading?: boolean;
}

export type ListDetailSection =
  | ListDetailKeyValueSection
  | ListDetailDocumentsSection
  | ListDetailContentSection
  | ListDetailItemListSection;

export type ListDetailSheetMode = 'view' | 'edit';
