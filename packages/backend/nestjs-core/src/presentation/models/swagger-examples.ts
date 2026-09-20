/**
 * Canonical Swagger example values.
 *
 * Every documented property, parameter, and response envelope draws its sample
 * value from here so the generated spec stays internally consistent — an `id`
 * returned by one endpoint matches the `id` accepted by the next, which lets
 * Swagger UI "Try it out" flows be copy-pasted end to end.
 */

/** Stable identifier used wherever a resource UUID is documented. */
export const EXAMPLE_UUID = '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55';

/** Secondary identifier, for payloads referencing two distinct resources. */
export const EXAMPLE_UUID_ALT = '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68';

/** Identifier of the acting user, for audit fields such as `createdBy`. */
export const EXAMPLE_USER_ID = 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41';

/** IdP subject claim. Auth-internal — never used for cross-module references. */
export const EXAMPLE_IDP_SUB = 'auth0|65f1a2b3c4d5e6f708192a3b';

export const EXAMPLE_EMAIL = 'asha.verma@example.org';
export const EXAMPLE_PHONE = '+919876543210';
export const EXAMPLE_DATE_TIME = '2026-03-14T09:30:00.000Z';
export const EXAMPLE_DATE = '2026-03-14';
export const EXAMPLE_TRACE_ID = '4b1f9c7a2e6d48f0';

/** Shared envelope examples, applied by the typed-response factories. */
export const ENVELOPE_EXAMPLES = {
  info: 'Success',
  timestamp: EXAMPLE_DATE_TIME,
  traceId: EXAMPLE_TRACE_ID,
  message: 'Operation completed successfully',
} as const;

export const PAGINATION_EXAMPLES = {
  pageIndex: 0,
  pageSize: 20,
  totalSize: 137,
} as const;
