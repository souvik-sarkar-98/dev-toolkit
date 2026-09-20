import type { FormEngineOptions } from '@ssdev-toolkit/forms-core';

/** Default engine options for public-site forms (encrypted fields hidden, phone defaults). */
export const publicFormEngineOptions: FormEngineOptions = {
  ignoreEncryptedValues: true,
  defaultPhoneCountryCode: '+91',
  phoneCountryCodes: [
    { code: '+91', label: 'IN +91' },
    { code: '+1', label: 'US +1' },
    { code: '+44', label: 'UK +44' },
  ],
};
