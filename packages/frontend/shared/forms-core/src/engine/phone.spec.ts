import { describe, expect, it } from 'vitest';
import {
  formatPhoneFieldValue,
  isPhoneValueEmpty,
  parsePhoneFieldValue,
  resolveDefaultPhoneCountryCode,
} from './phone.js';

describe('phone field value', () => {
  it('uses default country code from engine options', () => {
    expect(resolveDefaultPhoneCountryCode({ defaultPhoneCountryCode: '91' })).toBe('+91');
    expect(parsePhoneFieldValue('', { defaultPhoneCountryCode: '+44' })).toEqual({
      countryCode: '+44',
      nationalNumber: '',
    });
  });

  it('formats stored value as code plus national digits', () => {
    expect(formatPhoneFieldValue('+1', '555-123-4567')).toBe('+15551234567');
    expect(formatPhoneFieldValue('+91', '')).toBe('+91');
  });

  it('parses country-only stored value', () => {
    expect(
      parsePhoneFieldValue('+1', {
        defaultPhoneCountryCode: '+91',
        phoneCountryCodes: [{ code: '+91' }, { code: '+1' }],
      }),
    ).toEqual({ countryCode: '+1', nationalNumber: '' });
  });

  it('parses stored E.164-style values', () => {
    expect(
      parsePhoneFieldValue('+919876543210', {
        defaultPhoneCountryCode: '+1',
        phoneCountryCodes: [{ code: '+91' }, { code: '+1' }],
      }),
    ).toEqual({ countryCode: '+91', nationalNumber: '9876543210' });
  });

  it('treats phone as empty when only country code would remain', () => {
    expect(isPhoneValueEmpty('', { defaultPhoneCountryCode: '+1' })).toBe(true);
    expect(isPhoneValueEmpty('+1', { defaultPhoneCountryCode: '+91' })).toBe(true);
    expect(isPhoneValueEmpty('+15551234567', { defaultPhoneCountryCode: '+1' })).toBe(false);
  });
});
