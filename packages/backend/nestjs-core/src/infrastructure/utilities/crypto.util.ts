import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'crypto';
import { promisify } from 'util';

// Lazily load the native `bcrypt` addon only when hashing/validating is actually
// requested. Importing this module (e.g. for `applyConfig`, crypto helpers, or
// trace utilities) therefore never loads the native binding, which keeps the
// package usable on platforms where a bcrypt prebuild is unavailable.
async function loadBcrypt(): Promise<typeof import('bcrypt')> {
  const mod = (await import('bcrypt')) as unknown as {
    default?: typeof import('bcrypt');
  } & typeof import('bcrypt');
  return mod.default ?? mod;
}

const scryptAsync = promisify(scrypt);

// AES-256-GCM provides authenticated encryption: any tampering with the
// ciphertext, IV, or auth tag is detected at decryption time (unlike CTR,
// which is malleable and offers no integrity guarantee).
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12; // 96-bit nonce is the recommended size for GCM
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SEPARATOR = ':';
// Versioned prefix so the storage format can evolve without ambiguity.
const FORMAT_VERSION = 'v2';
const SALT_ROUNDS = 12;

async function deriveKey(encryptionKey: string, salt: Buffer): Promise<Buffer> {
  // A unique random salt per record means an attacker who recovers one derived
  // key (or builds a rainbow table) cannot reuse it across records/deployments.
  return (await scryptAsync(encryptionKey, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypts text using AES-256-GCM with a per-record random salt and IV.
 *
 * Output format: `v2:salt:iv:authTag:ciphertext` (each segment base64).
 */
export async function encryptText(plainText: string, encryptionKey: string): Promise<string> {
  if (!encryptionKey) {
    throw new Error('encryptionKey is required');
  }

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(encryptionKey, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(SEPARATOR);
}

/**
 * Decrypts text produced by {@link encryptText}. Throws if the payload was
 * tampered with (GCM auth tag mismatch) or is malformed.
 */
export async function decryptText(encryptedData: string, encryptionKey: string): Promise<string> {
  if (!encryptionKey) {
    throw new Error('encryptionKey is required');
  }

  const parts = encryptedData.split(SEPARATOR);
  if (parts.length !== 5 || parts[0] !== FORMAT_VERSION) {
    throw new Error('Invalid or unsupported encrypted token format');
  }

  const [, saltB64, ivB64, authTagB64, cipherB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(cipherB64, 'base64');

  if (
    salt.length !== SALT_LENGTH ||
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH
  ) {
    throw new Error('Invalid encrypted token format');
  }

  const key = await deriveKey(encryptionKey, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Returns true when a value is in the encrypted-at-rest format produced by
 * {@link encryptText}. Used to guard against accidentally persisting plaintext.
 */
export function isEncryptedText(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(SEPARATOR);
  return parts.length === 5 && parts[0] === FORMAT_VERSION;
}

/** Timing-safe string comparison for non-hashed secrets (e.g. CSRF state). */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Hashes a text using bcrypt with a configurable salt round.
 * @param text - The raw text to hash
 * @returns A bcrypt hash of the text
 */
export async function hashText(text: string): Promise<string> {
  const bcrypt = await loadBcrypt();
  return await bcrypt.hash(text, SALT_ROUNDS);
}

/**
 * Validates an incoming text against a stored bcrypt hash.
 * @param incomingText - The text provided by the client
 * @param storedHash - The bcrypt hash stored in your database
 * @returns True if the text matches, false otherwise
 */
export async function validateApiKey(incomingText: string, storedHash: string): Promise<boolean> {
  const bcrypt = await loadBcrypt();
  return await bcrypt.compare(incomingText, storedHash);
}
