import { decryptText, encryptText, isEncryptedText } from '@ssdev-toolkit/nestjs-core';
import { InvalidEncryptedTokenError } from '../errors/token-vault.errors';

/**
 * Immutable value object that wraps an AES-256-GCM encrypted token string.
 *
 * Construction rules:
 * - `fromEncrypted(raw)` — accepts an already-encrypted string from the DB.
 *   Validates the v2:salt:iv:authTag:ciphertext format; throws if malformed.
 * - `fromPlaintext(plain, secret)` — encrypts a raw token and wraps it.
 *
 * The aggregate never holds plaintext. All crypto details are encapsulated here.
 */
export class EncryptedToken {
  private constructor(private readonly _value: string) { }

  static fromEncrypted(raw: string): EncryptedToken {
    if (!isEncryptedText(raw)) {
      throw new InvalidEncryptedTokenError();
    }
    return new EncryptedToken(raw);
  }

  static async fromPlaintext(plaintext: string, secret: string): Promise<EncryptedToken> {
    const encrypted = await encryptText(plaintext, secret);
    return new EncryptedToken(encrypted);
  }

  async decrypt(secret: string): Promise<string> {
    return decryptText(this._value, secret);
  }

  /** Returns the raw encrypted string for persistence. Never log or expose this as a plaintext token. */
  get raw(): string {
    return this._value;
  }

  equals(other: EncryptedToken): boolean {
    return this._value === other._value;
  }
}
