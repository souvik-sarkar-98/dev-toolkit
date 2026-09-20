import { Injectable, Inject, Optional } from '@nestjs/common';
import { encryptText, decryptText } from '@ssdev-toolkit/nestjs-core';
import { CustomFieldType } from '../../domain/enums/custom-field-type.enum';
import {
  EncryptionKeyMissingError,
  InvalidFieldValueError,
} from '../../domain/errors/form.errors';
import { CustomFieldValueParsed } from '../../domain/value-objects/field-condition/field-condition.vo';
import type { FormFieldStoredValue } from '../utilities/form-field-stored-value.util';
import { CUSTOM_FORMS_OPTIONS } from '../custom-forms-options.token';
import { CustomFormsModuleOptions } from '../../custom-forms.schema';

/**
 * Infrastructure service responsible for converting field values between their
 * in-memory (typed) representation and their stored (`string[]`) form, including
 * encryption and decryption of sensitive fields.
 */
@Injectable()
export class FieldValueCodecService {
  constructor(
    @Optional()
    @Inject(CUSTOM_FORMS_OPTIONS)
    private readonly options: CustomFormsModuleOptions | null,
  ) { }

  /** Converts a typed in-memory value to the string array written to the DB. */
  serialise(fieldType: CustomFieldType, value: unknown): FormFieldStoredValue {
    if (value === null || value === undefined) {
      return [];
    }
    if (fieldType === CustomFieldType.Multiselect) {
      return (value as string[]).map(String);
    }
    return [String(value)];
  }

  /** Converts a raw DB string array back to a typed in-memory value. */
  parse(
    fieldType: CustomFieldType,
    stored: FormFieldStoredValue,
    fieldKey?: string,
  ): CustomFieldValueParsed {
    if (!stored.length) {
      return null;
    }

    switch (fieldType) {
      case CustomFieldType.Number:
        return parseFloat(stored[0]);
      case CustomFieldType.Boolean:
        return stored[0] === 'true';
      case CustomFieldType.Multiselect:
        return [...stored];
      default:
        return stored[0];
    }
  }

  /** Encrypts stored values when `isEncrypted` is true (single ciphertext element). */
  async encryptIfNeeded(
    stored: FormFieldStoredValue,
    fieldKey: string,
    isEncrypted: boolean,
  ): Promise<FormFieldStoredValue> {
    if (!isEncrypted) return stored;
    if (!stored.length) return stored;
    if (!this.options?.encryptionKey) throw new EncryptionKeyMissingError(fieldKey);
    const cipher = await encryptText(JSON.stringify(stored), this.options.encryptionKey);
    return [cipher];
  }

  /** Decrypts stored values when `isEncrypted` is true. */
  async decryptIfNeeded(
    stored: FormFieldStoredValue,
    fieldKey: string,
    isEncrypted: boolean,
  ): Promise<FormFieldStoredValue> {
    if (!isEncrypted) return stored;
    if (!stored.length) return stored;
    if (!this.options?.encryptionKey) throw new EncryptionKeyMissingError(fieldKey);
    try {
      const plaintext = await decryptText(stored[0], this.options.encryptionKey);
      const parsed = JSON.parse(plaintext) as unknown;
      if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === 'string')) {
        throw new InvalidFieldValueError(`Failed to decrypt value for field "${fieldKey}"`);
      }
      return parsed;
    } catch {
      throw new InvalidFieldValueError(`Failed to decrypt value for field "${fieldKey}"`);
    }
  }
}
