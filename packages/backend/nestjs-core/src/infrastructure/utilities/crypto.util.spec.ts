import {
  decryptText,
  encryptText,
  hashText,
  isEncryptedText,
  safeEqual,
  validateApiKey,
} from '@ssdev-toolkit/nestjs-core';

describe('Crypto utilities', () => {
  jest.setTimeout(30000);

  const ENCRYPTION_KEY = 'my-super-secret-test-encryption-key-32chars';

  describe('encryptText / decryptText', () => {
    it('round-trips plaintext correctly', async () => {
      const plain = 'Hello, World!';
      const encrypted = await encryptText(plain, ENCRYPTION_KEY);
      const decrypted = await decryptText(encrypted, ENCRYPTION_KEY);
      expect(decrypted).toBe(plain);
    });

    it('uses the versioned v2 GCM format', async () => {
      const encrypted = await encryptText('value', ENCRYPTION_KEY);
      expect(encrypted.startsWith('v2:')).toBe(true);
      expect(encrypted.split(':')).toHaveLength(5);
    });

    it('encrypted output is different from plaintext', async () => {
      const plain = 'test-token-value';
      const encrypted = await encryptText(plain, ENCRYPTION_KEY);
      expect(encrypted).not.toBe(plain);
    });

    it('produces different ciphertexts for same input (random salt + IV)', async () => {
      const plain = 'same-value';
      const enc1 = await encryptText(plain, ENCRYPTION_KEY);
      const enc2 = await encryptText(plain, ENCRYPTION_KEY);
      expect(enc1).not.toBe(enc2);
    });

    it('throws on malformed encrypted data (no separator)', async () => {
      await expect(
        decryptText('no-separator-here', ENCRYPTION_KEY),
      ).rejects.toThrow('Invalid or unsupported encrypted token format');
    });

    it('detects tampering with the ciphertext (GCM auth tag)', async () => {
      const encrypted = await encryptText('sensitive', ENCRYPTION_KEY);
      const parts = encrypted.split(':');
      // Flip a byte in the ciphertext segment.
      const cipher = Buffer.from(parts[4], 'base64');
      cipher[0] = cipher[0] ^ 0xff;
      parts[4] = cipher.toString('base64');
      await expect(decryptText(parts.join(':'), ENCRYPTION_KEY)).rejects.toThrow();
    });

    it('can handle long strings', async () => {
      const plain = 'x'.repeat(10000);
      const encrypted = await encryptText(plain, ENCRYPTION_KEY);
      const decrypted = await decryptText(encrypted, ENCRYPTION_KEY);
      expect(decrypted).toBe(plain);
    });

    it('fails to decrypt with wrong key', async () => {
      const plain = 'secret-value';
      const encrypted = await encryptText(plain, ENCRYPTION_KEY);
      await expect(
        decryptText(encrypted, 'wrong-key-that-is-also-long-enough!!'),
      ).rejects.toThrow();
    });
  });

  describe('isEncryptedText', () => {
    it('returns true for encrypted values and false otherwise', async () => {
      const encrypted = await encryptText('value', ENCRYPTION_KEY);
      expect(isEncryptedText(encrypted)).toBe(true);
      expect(isEncryptedText('plaintext')).toBe(false);
      expect(isEncryptedText('')).toBe(false);
      expect(isEncryptedText(undefined)).toBe(false);
    });
  });

  describe('safeEqual', () => {
    it('compares strings in constant time', () => {
      expect(safeEqual('abc', 'abc')).toBe(true);
      expect(safeEqual('abc', 'abd')).toBe(false);
      expect(safeEqual('abc', 'abcd')).toBe(false);
    });
  });

  describe('hashText / validateApiKey', () => {
    it('hashes text and validates correctly', async () => {
      const raw = 'my-api-key-12345';
      const hash = await hashText(raw);
      const isValid = await validateApiKey(raw, hash);
      expect(isValid).toBe(true);
    });

    it('returns false for wrong input', async () => {
      const raw = 'correct-key';
      const hash = await hashText(raw);
      const isValid = await validateApiKey('wrong-key', hash);
      expect(isValid).toBe(false);
    });

    it('produces different hashes for same input (bcrypt salting)', async () => {
      const raw = 'same-key';
      const hash1 = await hashText(raw);
      const hash2 = await hashText(raw);
      expect(hash1).not.toBe(hash2);
    });
  });
});
