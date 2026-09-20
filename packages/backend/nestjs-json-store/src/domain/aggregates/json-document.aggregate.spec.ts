import 'reflect-metadata';
import { JsonDocument } from './json-document.aggregate';
import { JsonDocumentCreatedEvent } from '../events/json-document-created.event';
import { JsonDocumentUpdatedEvent } from '../events/json-document-updated.event';
import { JsonDocumentDeletedEvent } from '../events/json-document-deleted.event';
import { JsonDocumentInvalidError } from '../errors/json-store.errors';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDoc(overrides: Partial<{ key: string; namespace: string; payload: Record<string, unknown> }> = {}): JsonDocument {
  return JsonDocument.create({
    key: overrides.key ?? 'welcome-email',
    namespace: overrides.namespace ?? 'correspondence',
    payload: overrides.payload ?? { subject: 'Hello' },
  });
}

// ─── create() ─────────────────────────────────────────────────────────────────

describe('JsonDocument.create()', () => {
  it('returns a JsonDocument aggregate with the supplied fields', () => {
    const doc = makeDoc();

    expect(doc).toBeInstanceOf(JsonDocument);
    expect(doc.key).toBe('welcome-email');
    expect(doc.namespace).toBe('correspondence');
    expect(doc.payload).toEqual({ subject: 'Hello' });
  });

  it('assigns a non-empty UUID as id', () => {
    const doc = makeDoc();

    expect(typeof doc.id).toBe('string');
    expect(doc.id.length).toBeGreaterThan(0);
  });

  it('trims whitespace from key and namespace', () => {
    const doc = JsonDocument.create({
      key: '  my-key  ',
      namespace: '  ns  ',
      payload: {},
    });

    expect(doc.key).toBe('my-key');
    expect(doc.namespace).toBe('ns');
  });

  it('emits exactly one JsonDocumentCreatedEvent', () => {
    const doc = makeDoc();

    expect(doc.domainEvents).toHaveLength(1);
    expect(doc.domainEvents[0]).toBeInstanceOf(JsonDocumentCreatedEvent);
  });

  it('the created event carries the aggregate itself', () => {
    const doc = makeDoc();
    const event = doc.domainEvents[0] as JsonDocumentCreatedEvent;

    expect(event.snapshot.id).toBe(doc.id);
    expect(event.aggregateId).toBe(doc.id);
  });

  it('throws JsonDocumentInvalidError when key is empty string', () => {
    expect(() => makeDoc({ key: '' })).toThrow(JsonDocumentInvalidError);
  });

  it('throws JsonDocumentInvalidError when key is whitespace only', () => {
    expect(() => makeDoc({ key: '   ' })).toThrow(JsonDocumentInvalidError);
  });

  it('throws JsonDocumentInvalidError when namespace is empty string', () => {
    expect(() => makeDoc({ namespace: '' })).toThrow(JsonDocumentInvalidError);
  });

  it('throws JsonDocumentInvalidError when namespace is whitespace only', () => {
    expect(() => makeDoc({ namespace: '   ' })).toThrow(JsonDocumentInvalidError);
  });

  it('two calls produce distinct ids', () => {
    const a = makeDoc();
    const b = makeDoc();

    expect(a.id).not.toBe(b.id);
  });
});

// ─── update() ─────────────────────────────────────────────────────────────────

describe('JsonDocument.update()', () => {
  it('replaces the payload', () => {
    const doc = makeDoc({ payload: { old: true } });
    doc.clearEvents();

    doc.update({ new: true });

    expect(doc.payload).toEqual({ new: true });
  });

  it('emits exactly one JsonDocumentUpdatedEvent', () => {
    const doc = makeDoc();
    doc.clearEvents();

    doc.update({ x: 1 });

    expect(doc.domainEvents).toHaveLength(1);
    expect(doc.domainEvents[0]).toBeInstanceOf(JsonDocumentUpdatedEvent);
  });

  it('the updated event carries the aggregate itself', () => {
    const doc = makeDoc();
    doc.clearEvents();

    doc.update({ x: 1 });

    const event = doc.domainEvents[0] as JsonDocumentUpdatedEvent;
    expect(event.snapshot.id).toBe(doc.id);
    expect(event.aggregateId).toBe(doc.id);
  });

  it('payload getter returns a defensive copy — mutating it does not affect stored state', () => {
    const doc = makeDoc({ payload: { name: 'original' } });

    const copy = doc.payload;
    copy['name'] = 'tampered';

    expect(doc.payload['name']).toBe('original');
  });

  it('consecutive updates accumulate events', () => {
    const doc = makeDoc();
    doc.clearEvents();

    doc.update({ step: 1 });
    doc.update({ step: 2 });

    expect(doc.domainEvents).toHaveLength(2);
    expect(doc.payload).toEqual({ step: 2 });
  });
});

// ─── markDeleted() ────────────────────────────────────────────────────────────

describe('JsonDocument.markDeleted()', () => {
  it('emits exactly one JsonDocumentDeletedEvent', () => {
    const doc = makeDoc();
    doc.clearEvents();

    doc.markDeleted();

    expect(doc.domainEvents).toHaveLength(1);
    expect(doc.domainEvents[0]).toBeInstanceOf(JsonDocumentDeletedEvent);
  });

  it('the deleted event carries the aggregate itself', () => {
    const doc = makeDoc();
    doc.clearEvents();

    doc.markDeleted();

    const event = doc.domainEvents[0] as JsonDocumentDeletedEvent;
    expect(event.snapshot.id).toBe(doc.id);
    expect(event.aggregateId).toBe(doc.id);
  });

  it('calling markDeleted() twice adds two events (no built-in idempotency guard)', () => {
    const doc = makeDoc();
    doc.clearEvents();

    doc.markDeleted();
    doc.markDeleted();

    expect(doc.domainEvents).toHaveLength(2);
    expect(doc.domainEvents.every((e) => e instanceof JsonDocumentDeletedEvent)).toBe(true);
  });
});

// ─── clearEvents() ────────────────────────────────────────────────────────────

describe('JsonDocument.clearEvents()', () => {
  it('empties the domain event queue', () => {
    const doc = makeDoc();
    expect(doc.domainEvents).toHaveLength(1);

    doc.clearEvents();

    expect(doc.domainEvents).toHaveLength(0);
  });
});

// ─── domain event payload ─────────────────────────────────────────────────────

describe('Domain events payload shape', () => {
  it('JsonDocumentCreatedEvent has occurredAt set to a recent date', () => {
    const before = new Date();
    const doc = makeDoc();
    const after = new Date();

    const event = doc.domainEvents[0] as JsonDocumentCreatedEvent;

    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('JsonDocumentUpdatedEvent has occurredAt set to a recent date', () => {
    const doc = makeDoc();
    doc.clearEvents();

    const before = new Date();
    doc.update({ x: 1 });
    const after = new Date();

    const event = doc.domainEvents[0] as JsonDocumentUpdatedEvent;

    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('JsonDocumentDeletedEvent has occurredAt set to a recent date', () => {
    const doc = makeDoc();
    doc.clearEvents();

    const before = new Date();
    doc.markDeleted();
    const after = new Date();

    const event = doc.domainEvents[0] as JsonDocumentDeletedEvent;

    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
