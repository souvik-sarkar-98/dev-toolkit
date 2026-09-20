import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { InvalidEncryptedTokenError } from '@ssdev-toolkit/nestjs-token-vault/domain/errors/token-vault.errors';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';

describe('EncryptedToken value object', () => {
  describe('fromPlaintext() → decrypt() round-trip', () => {
    it('encrypts and decrypts back to the original string', async () => {
      const plaintext = 'my-plaintext-access-token';
      const encrypted = await EncryptedToken.fromPlaintext(plaintext, SECRET);
      const decrypted = await encrypted.decrypt(SECRET);
      expect(decrypted).toBe(plaintext);
    });

    it('round-trips a long token (1000 chars)', async () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = await EncryptedToken.fromPlaintext(plaintext, SECRET);
      expect(await encrypted.decrypt(SECRET)).toBe(plaintext);
    });

    it('round-trips a token containing special characters', async () => {
      const plaintext = 'token=abc&scope=read+write&type=Bearer';
      const encrypted = await EncryptedToken.fromPlaintext(plaintext, SECRET);
      expect(await encrypted.decrypt(SECRET)).toBe(plaintext);
    });

    it('different inputs produce different ciphertexts', async () => {
      const e1 = await EncryptedToken.fromPlaintext('token-A', SECRET);
      const e2 = await EncryptedToken.fromPlaintext('token-B', SECRET);
      expect(e1.raw).not.toBe(e2.raw);
    });

    it('same plaintext encrypted twice produces different ciphertexts (random IV)', async () => {
      const e1 = await EncryptedToken.fromPlaintext('same-token', SECRET);
      const e2 = await EncryptedToken.fromPlaintext('same-token', SECRET);
      expect(e1.raw).not.toBe(e2.raw);
      // But both decrypt to the same value
      expect(await e1.decrypt(SECRET)).toBe('same-token');
      expect(await e2.decrypt(SECRET)).toBe('same-token');
    });

    it('produces a raw string that matches the v2:... format', async () => {
      const encrypted = await EncryptedToken.fromPlaintext('test', SECRET);
      expect(encrypted.raw).toMatch(/^v2:/);
    });
  });

  describe('fromEncrypted()', () => {
    it('accepts a previously encrypted raw string', async () => {
      const original = await EncryptedToken.fromPlaintext('original-token', SECRET);
      const restored = EncryptedToken.fromEncrypted(original.raw);
      expect(await restored.decrypt(SECRET)).toBe('original-token');
    });

    it('throws InvalidEncryptedTokenError for a plaintext string', () => {
      expect(() => EncryptedToken.fromEncrypted('plaintext-not-encrypted')).toThrow(
        InvalidEncryptedTokenError,
      );
    });

    it('throws InvalidEncryptedTokenError for empty string', () => {
      expect(() => EncryptedToken.fromEncrypted('')).toThrow(InvalidEncryptedTokenError);
    });

    it('throws InvalidEncryptedTokenError for a tampered ciphertext', async () => {
      const encrypted = await EncryptedToken.fromPlaintext('test', SECRET);
      const tampered = encrypted.raw.slice(0, -4) + 'AAAA';
      // Tampered value may still pass the format check — but decrypt should fail
      // The format may still match so we test both creation and decryption
      let token: EncryptedToken;
      try {
        token = EncryptedToken.fromEncrypted(tampered);
        // If it passes creation, decryption must fail
        await expect(token.decrypt(SECRET)).rejects.toThrow();
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidEncryptedTokenError);
      }
    });
  });

  describe('equals()', () => {
    it('returns true for two tokens with the same raw ciphertext', async () => {
      const enc = await EncryptedToken.fromPlaintext('same', SECRET);
      const restored = EncryptedToken.fromEncrypted(enc.raw);
      expect(enc.equals(restored)).toBe(true);
    });

    it('returns false for two tokens with different ciphertexts', async () => {
      const e1 = await EncryptedToken.fromPlaintext('token-A', SECRET);
      const e2 = await EncryptedToken.fromPlaintext('token-B', SECRET);
      expect(e1.equals(e2)).toBe(false);
    });
  });

  describe('raw getter', () => {
    it('exposes the encrypted string, not the plaintext', async () => {
      const plaintext = 'my-secret-token';
      const enc = await EncryptedToken.fromPlaintext(plaintext, SECRET);
      expect(enc.raw).not.toBe(plaintext);
      expect(enc.raw.length).toBeGreaterThan(0);
    });
  });
});
