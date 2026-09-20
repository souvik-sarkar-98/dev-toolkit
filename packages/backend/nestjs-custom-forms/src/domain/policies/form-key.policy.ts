import { InvalidFormKeyError } from '../errors/form.errors';

/** User-supplied keys: letters, digits, underscore; no spaces; must start with a letter. */
export const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export class FormKeyPolicy {
  static assertValidKey(key: string): void {
    if (!KEY_PATTERN.test(key)) {
      throw new InvalidFormKeyError(key);
    }
  }
}
