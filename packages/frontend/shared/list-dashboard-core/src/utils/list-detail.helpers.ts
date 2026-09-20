import {
  ListDetailContentSection,
  ListDetailField,
  ListDetailItemListItem,
  ListDetailItemListSection,
  ListDetailKeyValueSection,
} from '../models/list-detail.model.js';

export function detailTextField(label: string, value: string): ListDetailField {
  return { label, value, format: 'text' };
}

/** Sanitized HTML in a key-value row (links, inline emphasis, etc.). */
export function detailHtmlField(label: string, html: string): ListDetailField {
  return { label, value: html, format: 'html' };
}

export function detailKeyValueSection(
  id: string,
  title: string,
  fields: ListDetailField[],
  collapsed = false,
): ListDetailKeyValueSection {
  return { type: 'key_value', id, title, fields, collapsed };
}

/** Full-width instruction or notice block in the detail sheet. */
export function detailContentSection(
  id: string,
  html: string,
  options?: { title?: string; collapsed?: boolean },
): ListDetailContentSection {
  return {
    type: 'content',
    id,
    html,
    title: options?.title,
    collapsed: options?.collapsed ?? false,
  };
}

/** Nested collection section rendered by the framework `item_list` UI. */
export function detailItemListSection(
  id: string,
  title: string,
  items: ListDetailItemListItem[],
  options?: { emptyMessage?: string; collapsed?: boolean; loading?: boolean },
): ListDetailItemListSection {
  return {
    type: 'item_list',
    id,
    title,
    items,
    emptyMessage: options?.emptyMessage,
    collapsed: options?.collapsed ?? false,
    loading: options?.loading,
  };
}
