/**
 * Canonical field-type contract for custom-forms APIs, public-site form definitions,
 * and form UI renderers. Values are stable lowercase identifiers — do not remap at boundaries.
 */
export enum CustomFieldType {
  Text        = 'text',
  Textarea    = 'textarea',
  Email       = 'email',
  Phone       = 'phone',
  Number      = 'number',
  Boolean     = 'boolean',
  Date        = 'date',
  Select      = 'select',
  Multiselect = 'multiselect',
}

/** All supported field types — useful for UI libraries and runtime validation. */
export const CUSTOM_FIELD_TYPES = Object.values(CustomFieldType) as CustomFieldType[];
