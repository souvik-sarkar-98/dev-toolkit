import { describe, expect, it } from 'vitest';
import { sanitizeInternalRedirectUrl } from './redirect-url.util';

describe('sanitizeInternalRedirectUrl', () => {
  const fallback = '/secured/dashboard';

  it('returns fallback for empty values', () => {
    expect(sanitizeInternalRedirectUrl(undefined, fallback)).toBe(fallback);
    expect(sanitizeInternalRedirectUrl(null, fallback)).toBe(fallback);
    expect(sanitizeInternalRedirectUrl('   ', fallback)).toBe(fallback);
  });

  it('accepts safe internal paths', () => {
    expect(sanitizeInternalRedirectUrl('/secured/finance?chip=active', fallback)).toBe(
      '/secured/finance?chip=active',
    );
  });

  it('rejects protocol-relative and absolute urls', () => {
    expect(sanitizeInternalRedirectUrl('//evil.example/phish', fallback)).toBe(fallback);
    expect(sanitizeInternalRedirectUrl('https://evil.example/phish', fallback)).toBe(fallback);
  });

  it('rejects backslash protocol-relative paths', () => {
    expect(sanitizeInternalRedirectUrl('/\\evil.example', fallback)).toBe(fallback);
  });

  it('rejects control characters in paths', () => {
    expect(sanitizeInternalRedirectUrl('/secured/\u0007', fallback)).toBe(fallback);
  });
});
