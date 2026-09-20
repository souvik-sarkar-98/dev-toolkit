import { AesTokenEncryptor } from '@ssdev-toolkit/nestjs-token-vault/infrastructure/crypto/aes-token-encryptor';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';

function makeEncryptor(secret = SECRET): AesTokenEncryptor {
  const options = { encryption: { secret } };
  return new AesTokenEncryptor(options as any);
}

describe('AesTokenEncryptor', () => {
  describe('encrypt()', () => {
    it('returns an EncryptedToken', async () => {
      const encryptor = makeEncryptor();
      const result = await encryptor.encrypt('my-plaintext-token');
      expect(result).toBeInstanceOf(EncryptedToken);
    });

    it('produces a raw value in v2:... format', async () => {
      const encryptor = makeEncryptor();
      const result = await encryptor.encrypt('test');
      expect(result.raw).toMatch(/^v2:/);
    });

    it('different inputs produce different ciphertexts', async () => {
      const encryptor = makeEncryptor();
      const e1 = await encryptor.encrypt('token-A');
      const e2 = await encryptor.encrypt('token-B');
      expect(e1.raw).not.toBe(e2.raw);
    });

    it('same input encrypted twice produces different ciphertexts (random IV)', async () => {
      const encryptor = makeEncryptor();
      const e1 = await encryptor.encrypt('same-token');
      const e2 = await encryptor.encrypt('same-token');
      expect(e1.raw).not.toBe(e2.raw);
    });

    it('throws when encryption.secret is not configured', async () => {
      const encryptor = new AesTokenEncryptor({ encryption: {} } as any);
      await expect(encryptor.encrypt('token')).rejects.toThrow(
        /encryption\.secret is not configured/,
      );
    });
  });

  describe('decrypt()', () => {
    it('decrypts back to the original plaintext', async () => {
      const encryptor = makeEncryptor();
      const encrypted = await encryptor.encrypt('original-token-value');
      const decrypted = await encryptor.decrypt(encrypted);
      expect(decrypted).toBe('original-token-value');
    });

    it('encrypt → decrypt round-trip preserves the original value for long tokens', async () => {
      const encryptor = makeEncryptor();
      const plaintext = 'x'.repeat(500);
      const encrypted = await encryptor.encrypt(plaintext);
      expect(await encryptor.decrypt(encrypted)).toBe(plaintext);
    });

    it('encrypt → decrypt round-trip preserves tokens with special characters', async () => {
      const encryptor = makeEncryptor();
      const plaintext = 'ya29.a0AfH6SMA==&scope=read+write&type=Bearer';
      const encrypted = await encryptor.encrypt(plaintext);
      expect(await encryptor.decrypt(encrypted)).toBe(plaintext);
    });

    it('can decrypt a token encrypted by EncryptedToken.fromPlaintext directly', async () => {
      const encryptor = makeEncryptor();
      const encrypted = await EncryptedToken.fromPlaintext('direct-plaintext', SECRET);
      const decrypted = await encryptor.decrypt(encrypted);
      expect(decrypted).toBe('direct-plaintext');
    });
  });
});
