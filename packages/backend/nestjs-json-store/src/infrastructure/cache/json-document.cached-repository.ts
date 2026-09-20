import { Injectable } from '@nestjs/common';
import { BaseFilter, Page } from '@ssdev-toolkit/nestjs-core';
import { CacheService } from '@ssdev-toolkit/nestjs-persistence';
import { JsonDocument } from '../../domain/aggregates/json-document.aggregate';
import {
  IJsonDocumentRepository,
  JsonDocumentFilter,
} from '../../domain/repositories/json-document.repository';

/**
 * Serialisable snapshot of a JsonDocument — plain object safe for Redis
 * storage. ES private fields (#key, #namespace, #payload) are not included
 * in JSON.stringify, so we must explicitly project the public getters here
 * and reconstruct the aggregate on the way out.
 */
interface JsonDocumentSnapshot {
  id: string;
  key: string;
  namespace: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Read-through / write-invalidate cache wrapper that sits in front of
 * JsonDocumentPrismaRepository.  The application layer always calls through
 * the IJsonDocumentRepository token and never knows whether a result came
 * from Redis or Postgres.
 *
 * Cache key scheme:
 *   json-store:id:{id}           → findById
 *   json-store:key:{ns}:{key}    → findByKey
 *   json-store:ns:{namespace}    → findByNamespace
 *   json-store:all               → findAll (no filter)
 *
 * findPaged and count are filter-dependent and not cached.
 */
@Injectable()
export class JsonDocumentCachedRepository implements IJsonDocumentRepository {
  constructor(
    private readonly db: IJsonDocumentRepository,
    private readonly cache: CacheService,
    readonly ttlMs: number,
  ) { }

  // ── Cache key helpers ──────────────────────────────────────────────────────

  private cacheKeyById(id: string): string {
    return `json-store:id:${id}`;
  }

  private cacheKeyByDoc(key: string, namespace: string): string {
    return `json-store:key:${namespace}:${key}`;
  }

  private cacheKeyByNamespace(namespace: string): string {
    return `json-store:ns:${namespace}`;
  }

  private readonly ALL_KEY = 'json-store:all';

  // ── Snapshot helpers ───────────────────────────────────────────────────────

  private toSnapshot(doc: JsonDocument): JsonDocumentSnapshot {
    return {
      id: doc.id,
      key: doc.key,
      namespace: doc.namespace,
      payload: doc.payload,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private fromSnapshot(snap: JsonDocumentSnapshot): JsonDocument {
    return new JsonDocument(
      snap.id,
      snap.key,
      snap.namespace,
      snap.payload,
      new Date(snap.createdAt),
      new Date(snap.updatedAt),
    );
  }

  // ── Read methods (cached) ──────────────────────────────────────────────────

  async findById(id: string): Promise<JsonDocument | null> {
    const snap = await this.cache.getOrSet<JsonDocumentSnapshot | null>(
      this.cacheKeyById(id),
      async () => {
        const doc = await this.db.findById(id);
        return doc ? this.toSnapshot(doc) : null;
      },
      this.ttlMs,
    );
    return snap ? this.fromSnapshot(snap) : null;
  }

  async findByKey(key: string, namespace: string): Promise<JsonDocument | null> {
    const snap = await this.cache.getOrSet<JsonDocumentSnapshot | null>(
      this.cacheKeyByDoc(key, namespace),
      async () => {
        const doc = await this.db.findByKey(key, namespace);
        return doc ? this.toSnapshot(doc) : null;
      },
      this.ttlMs,
    );
    return snap ? this.fromSnapshot(snap) : null;
  }

  async findByNamespace(namespace: string): Promise<JsonDocument[]> {
    const snaps = await this.cache.getOrSet<JsonDocumentSnapshot[]>(
      this.cacheKeyByNamespace(namespace),
      async () => {
        const docs = await this.db.findByNamespace(namespace);
        return docs.map((d) => this.toSnapshot(d));
      },
      this.ttlMs,
    );
    return snaps.map((s) => this.fromSnapshot(s));
  }

  async findAll(filter?: JsonDocumentFilter): Promise<JsonDocument[]> {
    // Only cache the unfiltered full-scan; arbitrary filters bypass the cache to
    // avoid an unbounded number of cache keys and complex invalidation logic.
    if (!filter?.namespace && !filter?.key) {
      const snaps = await this.cache.getOrSet<JsonDocumentSnapshot[]>(
        this.ALL_KEY,
        async () => {
          const docs = await this.db.findAll();
          return docs.map((d) => this.toSnapshot(d));
        },
        this.ttlMs,
      );
      return snaps.map((s) => this.fromSnapshot(s));
    }
    return this.db.findAll(filter);
  }

  // Pass-through — filter-dependent; caching would require per-filter keys and
  // complex invalidation, which is not worth it for this admin-only surface.
  findPaged(filter?: BaseFilter<JsonDocumentFilter>): Promise<Page<JsonDocument>> {
    return this.db.findPaged(filter);
  }

  count(filter: JsonDocumentFilter): Promise<number> {
    return this.db.count(filter);
  }

  // ── Write methods — persist then evict ────────────────────────────────────

  async create(entity: JsonDocument): Promise<JsonDocument> {
    const result = await this.db.create(entity);
    await this.evict(result);
    return result;
  }

  async update(id: string, entity: JsonDocument): Promise<JsonDocument> {
    const result = await this.db.update(id, entity);
    await this.evict(result);
    return result;
  }

  async delete(id: string): Promise<void> {
    // Resolve key/namespace before the row is gone so every cache entry can be
    // targeted precisely.  findById hits the local cache first so this is free
    // when the document was already warmed.
    const existing = await this.findById(id);
    await this.db.delete(id);

    const ops: Promise<void>[] = [
      this.cache.del(this.cacheKeyById(id)),
      this.cache.del(this.ALL_KEY),
    ];
    if (existing) {
      ops.push(this.cache.del(this.cacheKeyByDoc(existing.key, existing.namespace)));
      ops.push(this.cache.del(this.cacheKeyByNamespace(existing.namespace)));
    }
    await Promise.all(ops);
  }

  async upsertByKey(
    key: string,
    namespace: string,
    payload: Record<string, unknown>,
  ): Promise<{ document: JsonDocument; wasCreated: boolean; payloadChanged: boolean }> {
    const result = await this.db.upsertByKey(key, namespace, payload);
    // Skip eviction when the payload was identical — the cached data is still
    // accurate and the domain layer already skips event publication for this case.
    if (result.payloadChanged) {
      await this.evict(result.document);
    }
    return result;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async evict(doc: JsonDocument): Promise<void> {
    await Promise.all([
      this.cache.del(this.cacheKeyById(doc.id)),
      this.cache.del(this.cacheKeyByDoc(doc.key, doc.namespace)),
      this.cache.del(this.cacheKeyByNamespace(doc.namespace)),
      this.cache.del(this.ALL_KEY),
    ]);
  }
}
