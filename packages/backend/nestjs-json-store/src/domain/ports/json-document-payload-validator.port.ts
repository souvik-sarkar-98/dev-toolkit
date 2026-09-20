export const IJsonDocumentPayloadValidatorPort = Symbol('IJsonDocumentPayloadValidatorPort');

/**
 * Optional write-time payload validator for json-store documents.
 * Host apps register namespace/key-specific schemas; the default no-op
 * implementation allows all payloads through.
 */
export interface IJsonDocumentPayloadValidatorPort {
  validate(namespace: string, key: string, payload: Record<string, unknown>): void;
}
