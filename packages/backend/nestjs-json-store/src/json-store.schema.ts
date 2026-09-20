import type { Type } from '@nestjs/common';
import type { IJsonDocumentPayloadValidatorPort } from './domain/ports/json-document-payload-validator.port';

/** Default TTL for cached JSON documents: 30 days in milliseconds. */
export const DEFAULT_JSON_STORE_CACHE_TTL_MS = 2_592_000_000;

export interface JsonStoreModuleOptions {
  /**
   * When true, the module registers the JsonDocumentController and exposes
   * CRUD REST endpoints at /json-store.
   * Default: false — consumers that only need programmatic access via
   * JsonStoreFacade can omit the HTTP surface entirely.
   */
  exposeController?: boolean;

  /**
   * Time-to-live in milliseconds for cached JSON documents.
   * Write operations (create, update, upsert, delete) evict the relevant
   * cache entries immediately, so a long TTL is safe for static / seeded data.
   * Default: 2_592_000_000 (30 days).
   */
  cacheTtlMs?: number;

  /**
   * Optional write-time payload validator implementation.
   * Default: NoOpJsonDocumentPayloadValidator (permissive — no schema enforcement).
   */
  payloadValidator?: Type<IJsonDocumentPayloadValidatorPort>;
}
