import type { FormEngineOptions, PhoneCountryCodeOption } from '../models/types.js';

export type { PhoneCountryCodeOption };

export interface ParsedPhoneValue {
  countryCode: string;
  nationalNumber: string;
}

const DEFAULT_DIAL_CODE = '+1';

export function normalizePhoneCountryCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_DIAL_CODE;
  const digits = trimmed.replace(/^\+/, '').replace(/\D/g, '');
  if (!digits) return DEFAULT_DIAL_CODE;
  return `+${digits}`;
}

export function resolveDefaultPhoneCountryCode(options?: FormEngineOptions): string {
  return normalizePhoneCountryCode(options?.defaultPhoneCountryCode ?? DEFAULT_DIAL_CODE);
}

export function resolvePhoneCountryCodeOptions(
  options?: FormEngineOptions,
): PhoneCountryCodeOption[] {
  const fallback = resolveDefaultPhoneCountryCode(options);
  const list = options?.phoneCountryCodes;
  if (!list?.length) {
    return [{ code: fallback }];
  }
  return list.map((entry) => ({
    code: normalizePhoneCountryCode(entry.code),
    label: entry.label,
  }));
}

/** Stored form value: dial code, or dial code + national digits (E.164-style, no spaces). */
export function formatPhoneFieldValue(countryCode: string, nationalNumber: string): string {
  const code = normalizePhoneCountryCode(countryCode);
  const nationalDigits = nationalNumber.replace(/\D/g, '');
  if (!nationalDigits) return code;
  return `${code}${nationalDigits}`;
}

export function parsePhoneFieldValue(
  value: unknown,
  options?: FormEngineOptions,
): ParsedPhoneValue {
  const defaultCode = resolveDefaultPhoneCountryCode(options);
  if (value === null || value === undefined || value === '') {
    return { countryCode: defaultCode, nationalNumber: '' };
  }

  const raw = String(value).trim();
  const codes = resolvePhoneCountryCodeOptions(options)
    .map((c) => normalizePhoneCountryCode(c.code))
    .sort((a, b) => b.length - a.length);

  for (const code of codes) {
    if (raw === code || raw.startsWith(code)) {
      const nationalNumber = raw === code ? '' : raw.slice(code.length).replace(/\D/g, '');
      return {
        countryCode: code,
        nationalNumber,
      };
    }
  }

  if (raw.startsWith('+')) {
    const match = /^\+(\d{1,4})(\d*)$/.exec(raw.replace(/\s/g, ''));
    if (match) {
      return {
        countryCode: `+${match[1]}`,
        nationalNumber: match[2] ?? '',
      };
    }
  }

  return {
    countryCode: defaultCode,
    nationalNumber: raw.replace(/\D/g, ''),
  };
}

export function isPhoneValueEmpty(value: unknown, options?: FormEngineOptions): boolean {
  return parsePhoneFieldValue(value, options).nationalNumber.length === 0;
}

export function phoneValueForValidation(value: unknown, options?: FormEngineOptions): string {
  const { countryCode, nationalNumber } = parsePhoneFieldValue(value, options);
  if (!nationalNumber) return '';
  return formatPhoneFieldValue(countryCode, nationalNumber);
}
