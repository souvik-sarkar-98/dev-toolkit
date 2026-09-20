import { InvalidFieldValueError } from '../../errors/form.errors';

/**
 * Immutable value object representing one selectable option for a
 * `select` or `multiselect` custom field.
 *
 * `key`   — the stable identifier persisted in CustomFieldValue.value.
 * `label` — the human-readable display text shown in the UI.
 *
 * Separating key from label means the label can be renamed without any
 * migration of stored field values.
 */
export class FieldOption {
  private constructor(
    readonly key: string,
    readonly label: string,
  ) {}

  static of(key: string, label: string): FieldOption {
    if (!key?.trim()) {
      throw new InvalidFieldValueError('FieldOption key cannot be empty');
    }
    if (!label?.trim()) {
      throw new InvalidFieldValueError('FieldOption label cannot be empty');
    }
    return new FieldOption(key.trim(), label.trim());
  }

  equals(other: FieldOption): boolean {
    return this.key === other.key && this.label === other.label;
  }
}
