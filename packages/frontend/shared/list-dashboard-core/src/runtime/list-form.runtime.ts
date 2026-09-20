import {
  fromPublicFormDefinition,
  type FieldOption,
  type FormDefinition,
  type FormValues,
} from '@ssdev-toolkit/forms-core';

export interface ListFormContext<TEntity = unknown> {
  dashboardId?: string;
  /** @deprecated Use dashboardId for new list-dashboard consumers. */
  experienceId?: string;
  slot?: string;
  chip?: string;
  activeChip?: string;
  entity?: TEntity;
  refData?: Readonly<Record<string, unknown>>;
  presets?: Readonly<Record<string, unknown>>;
  values?: Readonly<FormValues>;
  accumulatedValues?: Readonly<FormValues>;
  asyncOptions?:
    | readonly FieldOption[]
    | Readonly<Record<string, readonly FieldOption[]>>;
  locale?: string;
  permissions?: readonly string[];
  data?: Readonly<Record<string, unknown>>;
}

/** @deprecated Use ListFormContext. */
export type ListFormResolverContext<TEntity = unknown> =
  ListFormContext<TEntity>;

export interface ListObservableSubscription {
  unsubscribe?: () => void;
}

export interface ListObservableLike<T> {
  subscribe(
    observer:
      | {
          next?: (value: T) => void;
          error?: (error: unknown) => void;
          complete?: () => void;
        }
      | ((value: T) => void),
    error?: (error: unknown) => void,
    complete?: () => void,
  ): ListObservableSubscription | (() => void) | void;
}

export type ListAsyncResult<T> =
  | PromiseLike<T>
  | ListObservableLike<T>;

export interface ListBackendFormEnvelope {
  definition: unknown;
  version?: string | number;
  metadata?: Readonly<Record<string, unknown>>;
}

interface ListFormSourceBase {
  /** Adds tenant/locale/etc. identity to the instance cache key. */
  cacheKey?: (context: ListFormContext) => string;
}

export interface LocalListFormSource extends ListFormSourceBase {
  kind: 'local';
  /** Plan form; preferred for context-dependent local definitions. */
  build?: (context: ListFormContext) => FormDefinition;
  /** Backward-compatible static or builder form. One of build/definition is required at runtime. */
  definition?:
    | FormDefinition
    | ((context: ListFormContext) => FormDefinition);
}

export interface BackendListFormSource extends ListFormSourceBase {
  kind: 'backend';
  load: (
    context: ListFormContext,
  ) => ListAsyncResult<unknown | ListBackendFormEnvelope>;
  /** Defaults to forms-core's fromPublicFormDefinition adapter. */
  map?: (payload: unknown, context: ListFormContext) => FormDefinition;
}

export interface HybridListFormSource extends ListFormSourceBase {
  kind: 'hybrid';
  /** Preferred mode: resolve any source, then enrich it with runtime data. */
  base?: ListFormSource;
  enrich?: (
    definition: FormDefinition,
    context: ListFormContext,
  ) => FormDefinition | PromiseLike<FormDefinition>;
  /** Legacy merge mode. */
  local?:
    | FormDefinition
    | ((context: ListFormContext) => FormDefinition);
  load?: (
    context: ListFormContext,
  ) => ListAsyncResult<unknown | ListBackendFormEnvelope>;
  /** Defaults to forms-core's fromPublicFormDefinition adapter. */
  map?: (payload: unknown, context: ListFormContext) => FormDefinition;
  /** Defaults to a field-aware remote-over-local merge. */
  merge?: (
    local: FormDefinition,
    backend: FormDefinition,
    context: ListFormContext,
  ) => FormDefinition;
}

export type ListFormSource =
  | LocalListFormSource
  | BackendListFormSource
  | HybridListFormSource;

export interface ResolvedListForm {
  definition: FormDefinition;
  source: ListFormSource['kind'];
  cacheKey: string;
  resolvedAt: number;
  version?: string | number;
  metadata?: Readonly<Record<string, unknown>>;
}

function resolveLocal(
  source: LocalListFormSource,
  context: ListFormContext,
): FormDefinition {
  if (source.build) return source.build(context);
  const definition = source.definition;
  if (!definition) {
    throw new ListFormResolutionError(
      'missing-local-definition',
      'Local list form requires build or definition',
    );
  }
  return typeof definition === 'function' ? definition(context) : definition;
}

export class ListFormResolutionError extends Error {
  constructor(
    readonly code:
      | 'missing-local-definition'
      | 'invalid-backend-result'
      | 'empty-backend-result'
      | 'invalid-definition'
      | 'invalid-hybrid-source',
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'ListFormResolutionError';
  }
}

function isObservableLike<T>(value: unknown): value is ListObservableLike<T> {
  return value !== null
    && typeof value === 'object'
    && typeof (value as { subscribe?: unknown }).subscribe === 'function';
}

async function firstAsyncValue<T>(result: ListAsyncResult<T>): Promise<T> {
  if (!isObservableLike<T>(result)) return Promise.resolve(result);

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let subscription: ListObservableSubscription | (() => void) | void;
    const cleanup = (): void => {
      if (typeof subscription === 'function') subscription();
      else subscription?.unsubscribe?.();
    };
    const succeed = (value: T): void => {
      if (settled) return;
      settled = true;
      resolve(value);
      queueMicrotask(cleanup);
    };
    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    try {
      subscription = result.subscribe({
        next: succeed,
        error: fail,
        complete: () => {
          if (!settled) {
            fail(new ListFormResolutionError(
              'empty-backend-result',
              'Backend form source completed without a definition',
            ));
          }
        },
      });
    } catch (error) {
      fail(error);
    }
  });
}

function unpackBackendResult(value: unknown): {
  payload: unknown;
  version?: string | number;
  metadata?: Readonly<Record<string, unknown>>;
} {
  if (value == null) {
    throw new ListFormResolutionError(
      'empty-backend-result',
      'Backend form source returned no definition',
    );
  }
  if (typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'definition')) {
    const envelope = value as ListBackendFormEnvelope;
    if (envelope.definition == null) {
      throw new ListFormResolutionError(
        'empty-backend-result',
        'Backend form envelope has no definition',
      );
    }
    return {
      payload: envelope.definition,
      version: envelope.version,
      metadata: envelope.metadata,
    };
  }
  return { payload: value };
}

function assertFormDefinition(definition: FormDefinition): FormDefinition {
  if (
    definition == null
    || typeof definition !== 'object'
    || (!definition.id && !definition.key)
    || !Array.isArray(definition.fields)
  ) {
    throw new ListFormResolutionError(
      'invalid-definition',
      'Resolved list form is missing an id/key or fields array',
    );
  }
  return definition;
}

async function resolveBackend(
  load: NonNullable<BackendListFormSource['load']>,
  map: BackendListFormSource['map'],
  context: ListFormContext,
): Promise<{
  definition: FormDefinition;
  version?: string | number;
  metadata?: Readonly<Record<string, unknown>>;
}> {
  let raw: unknown;
  try {
    raw = await firstAsyncValue(load(context));
  } catch (error) {
    if (error instanceof ListFormResolutionError) throw error;
    throw new ListFormResolutionError(
      'invalid-backend-result',
      'Backend form source failed',
      error,
    );
  }
  const { payload, version, metadata } = unpackBackendResult(raw);
  let definition: FormDefinition;
  try {
    definition = map ? map(payload, context) : fromPublicFormDefinition(payload);
  } catch (error) {
    throw new ListFormResolutionError(
      'invalid-definition',
      'Backend form definition could not be mapped',
      error,
    );
  }
  return { definition: assertFormDefinition(definition), version, metadata };
}

export function mergeListForms(
  local: FormDefinition,
  backend: FormDefinition,
): FormDefinition {
  const localFields = new Map(local.fields.map(field => [field.key, field]));
  const remoteKeys = new Set(backend.fields.map(field => field.key));

  return {
    ...local,
    ...backend,
    id: backend.id || local.id,
    key: backend.key || local.key,
    label: backend.label || local.label,
    description: backend.description ?? local.description,
    fields: [
      ...backend.fields.map(field => ({
        ...localFields.get(field.key),
        ...field,
      })),
      ...local.fields.filter(field => !remoteKeys.has(field.key)),
    ],
  };
}

export async function resolveListForm(
  source: ListFormSource,
  context: ListFormContext,
  cacheKey = source.cacheKey?.(context) ?? '',
): Promise<ResolvedListForm> {
  let definition: FormDefinition;
  let version: string | number | undefined;
  let metadata: Readonly<Record<string, unknown>> | undefined;

  switch (source.kind) {
    case 'local':
      definition = assertFormDefinition(resolveLocal(source, context));
      break;
    case 'backend': {
      const backend = await resolveBackend(source.load, source.map, context);
      ({ definition, version, metadata } = backend);
      break;
    }
    case 'hybrid': {
      if (source.base && source.enrich) {
        const base = await resolveListForm(source.base, context);
        definition = assertFormDefinition(
          await source.enrich(base.definition, context),
        );
        version = base.version;
        metadata = base.metadata;
        break;
      }
      if (!source.local || !source.load) {
        throw new ListFormResolutionError(
          'invalid-hybrid-source',
          'Hybrid list form requires base/enrich or local/load',
        );
      }
      const local = resolveLocal(
        { kind: 'local', definition: source.local },
        context,
      );
      const backend = await resolveBackend(source.load, source.map, context);
      definition = assertFormDefinition(
        (source.merge ?? mergeListForms)(
          local,
          backend.definition,
          context,
        ),
      );
      version = backend.version;
      metadata = backend.metadata;
      break;
    }
  }

  return {
    definition,
    source: source.kind,
    cacheKey,
    resolvedAt: Date.now(),
    version,
    metadata,
  };
}

export class ListFormResolver {
  private readonly resolved = new Map<string, ResolvedListForm>();
  private readonly pending = new Map<string, Promise<ResolvedListForm>>();

  async resolve(
    id: string,
    source: ListFormSource,
    context: ListFormContext,
  ): Promise<ResolvedListForm> {
    const key = this.key(id, source, context);
    const cached = this.resolved.get(key);
    if (cached) return cached;

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    let request: Promise<ResolvedListForm>;
    request = resolveListForm(source, context, key)
      .then(result => {
        if (this.pending.get(key) === request) {
          this.resolved.set(key, result);
        }
        return result;
      })
      .finally(() => {
        if (this.pending.get(key) === request) {
          this.pending.delete(key);
        }
      });

    this.pending.set(key, request);
    return request;
  }

  invalidate(id?: string): void {
    if (id === undefined) {
      this.resolved.clear();
      this.pending.clear();
      return;
    }

    const prefix = `${id}\u0000`;
    for (const key of this.resolved.keys()) {
      if (key.startsWith(prefix)) this.resolved.delete(key);
    }
    for (const key of this.pending.keys()) {
      if (key.startsWith(prefix)) this.pending.delete(key);
    }
  }

  private key(
    id: string,
    source: ListFormSource,
    context: ListFormContext,
  ): string {
    return `${id}\u0000${source.cacheKey?.(context) ?? ''}`;
  }
}
