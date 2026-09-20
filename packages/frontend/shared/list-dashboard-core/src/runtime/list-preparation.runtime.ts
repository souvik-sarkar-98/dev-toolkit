export type ListPreparationTrigger =
  | 'init'
  | 'filterOpen'
  | 'createOpen'
  | 'editPrepare'
  | 'operation'
  /** Backward-compatible aliases. */
  | 'list'
  | 'detail'
  | 'create'
  | 'bulkEdit';

export type ListPreparationCachePolicy =
  | 'none'
  | 'instance'
  | 'byInputs';

export interface ListPreparationCacheConfig<TContext> {
  policy: ListPreparationCachePolicy;
  inputs?: (context: TContext) => unknown;
}

export interface ListPreparationTaskRunContext {
  signal?: AbortSignal;
  results: ReadonlyMap<string, unknown>;
}

export interface ListPreparationTask<TContext = unknown, TResult = unknown> {
  id: string;
  dependsOn?: string[];
  cache?: ListPreparationCachePolicy | ListPreparationCacheConfig<TContext>;
  cachePolicy?: ListPreparationCachePolicy;
  /** Changes to these inputs invalidate this task's instance-cached result. */
  invalidationInputs?: (context: TContext) => unknown;
  inputs?: (context: TContext) => unknown;
  /** Clear these task result caches after this task succeeds. */
  invalidates?: string[];
  run: (
    context: TContext,
    signal?: AbortSignal,
    execution?: ListPreparationTaskRunContext,
  ) => TResult | Promise<TResult>;
}

export class ListPreparationError extends Error {
  constructor(
    message: string,
    readonly taskId?: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'ListPreparationError';
  }
}

export class ListPreparationCycleError extends Error {
  constructor(readonly cycle: readonly string[]) {
    super(`list preparation cycle detected: ${cycle.join(' -> ')}`);
    this.name = 'ListPreparationCycleError';
  }
}

export class ListPreparationTaskNotFoundError extends ListPreparationError {
  constructor(taskId: string) {
    super(`Unknown list preparation task: ${taskId}`, taskId);
    this.name = 'ListPreparationTaskNotFoundError';
  }
}

export class ListPreparationDuplicateTaskError extends ListPreparationError {
  constructor(taskId: string) {
    super(`Duplicate list preparation task: ${taskId}`, taskId);
    this.name = 'ListPreparationDuplicateTaskError';
  }
}

export class ListPreparationTaskError extends ListPreparationError {
  constructor(taskId: string, cause: unknown) {
    super(`list preparation task failed: ${taskId}`, taskId, cause);
    this.name = 'ListPreparationTaskError';
  }
}

export class ListPreparationAbortedError extends ListPreparationError {
  constructor(taskId?: string) {
    super(
      taskId
        ? `list preparation task aborted: ${taskId}`
        : 'list preparation aborted',
      taskId,
    );
    this.name = 'ListPreparationAbortedError';
  }
}

export function orderPreparationTasks<TContext>(
  tasks: readonly ListPreparationTask<TContext>[],
  requestedIds?: readonly string[],
): ListPreparationTask<TContext>[] {
  const byId = new Map<string, ListPreparationTask<TContext>>();
  for (const task of tasks) {
    if (byId.has(task.id)) {
      throw new ListPreparationDuplicateTaskError(task.id);
    }
    byId.set(task.id, task);
  }

  const selected = new Set<string>();
  const include = (id: string): void => {
    const task = byId.get(id);
    if (!task) throw new ListPreparationTaskNotFoundError(id);
    if (selected.has(id)) return;
    selected.add(id);
    for (const dependency of task.dependsOn ?? []) include(dependency);
  };
  for (const id of requestedIds ?? byId.keys()) include(id);

  const ordered: ListPreparationTask<TContext>[] = [];
  const complete = new Set<string>();
  const active: string[] = [];

  const visit = (id: string): void => {
    if (complete.has(id)) return;
    const cycleStart = active.indexOf(id);
    if (cycleStart >= 0) {
      throw new ListPreparationCycleError([...active.slice(cycleStart), id]);
    }

    active.push(id);
    const task = byId.get(id)!;
    for (const dependency of task.dependsOn ?? []) {
      if (selected.has(dependency)) visit(dependency);
    }
    active.pop();
    complete.add(id);
    ordered.push(task);
  };

  for (const id of selected) visit(id);
  return ordered;
}

export async function runPreparationTasks<TContext>(
  tasks: readonly ListPreparationTask<TContext>[],
  context: TContext,
  requestedIds?: readonly string[],
  optionsOrSignal: ListPreparationRunOptions | AbortSignal = {},
): Promise<ReadonlyMap<string, unknown>> {
  const options = isAbortSignal(optionsOrSignal)
    ? { signal: optionsOrSignal }
    : optionsOrSignal;
  const results = new Map<string, unknown>();
  for (const task of orderPreparationTasks(tasks, requestedIds)) {
    if (options.signal?.aborted) {
      throw new ListPreparationAbortedError(task.id);
    }
    try {
      const result = await abortable(
        Promise.resolve().then(() =>
          task.run(
            context,
            options.signal,
            { signal: options.signal, results },
          ),
        ),
        options.signal,
        task.id,
      );
      results.set(task.id, result);
    } catch (error) {
      if (error instanceof ListPreparationError) throw error;
      throw new ListPreparationTaskError(task.id, error);
    }
  }
  return results;
}

export interface ListPreparationRunOptions {
  signal?: AbortSignal;
  /** Ignore persistent result caches for this run. */
  force?: boolean;
}

function isAbortSignal(value: unknown): value is AbortSignal {
  return value !== null
    && typeof value === 'object'
    && typeof (value as AbortSignal).aborted === 'boolean'
    && typeof (value as AbortSignal).addEventListener === 'function';
}

function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  taskId: string,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new ListPreparationAbortedError(taskId));

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new ListPreparationAbortedError(taskId));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      value => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      error => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function stableInput(value: unknown): string {
  const seen = new WeakSet<object>();
  const normalize = (current: unknown): unknown => {
    if (current === undefined) return '__undefined__';
    if (
      current === null
      || typeof current === 'string'
      || typeof current === 'number'
      || typeof current === 'boolean'
    ) {
      return current;
    }
    if (typeof current !== 'object') return String(current);
    if (seen.has(current)) {
      throw new ListPreparationError(
        'Preparation invalidation inputs must not contain cycles',
      );
    }
    seen.add(current);
    if (Array.isArray(current)) return current.map(normalize);
    return Object.fromEntries(
      Object.entries(current as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalize(item)]),
    );
  };
  return JSON.stringify(normalize(value));
}

export class ListPreparationRunner<TContext = unknown> {
  private readonly results = new Map<string, unknown>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly latestKeys = new Map<string, string>();

  constructor(
    private readonly tasks: readonly ListPreparationTask<TContext>[],
    private readonly triggers: Partial<Record<ListPreparationTrigger, string[]>> = {},
  ) {
    orderPreparationTasks(tasks);
    for (const ids of Object.values(triggers)) {
      orderPreparationTasks(tasks, ids);
    }
  }

  run(
    trigger: ListPreparationTrigger,
    context: TContext,
    optionsOrSignal: ListPreparationRunOptions | AbortSignal = {},
  ): Promise<ReadonlyMap<string, unknown>> {
    const options = isAbortSignal(optionsOrSignal)
      ? { signal: optionsOrSignal }
      : optionsOrSignal;
    return this.runSelected(context, this.triggers[trigger], options);
  }

  /** Runs an explicit task id list (plus dependencies) instead of a trigger. */
  runTasks(
    taskIds: readonly string[],
    context: TContext,
    optionsOrSignal: ListPreparationRunOptions | AbortSignal = {},
  ): Promise<ReadonlyMap<string, unknown>> {
    const options = isAbortSignal(optionsOrSignal)
      ? { signal: optionsOrSignal }
      : optionsOrSignal;
    return this.runSelected(context, taskIds, options);
  }

  invalidate(taskId?: string, inputs?: unknown): void {
    if (taskId === undefined) {
      this.results.clear();
      this.pending.clear();
      this.latestKeys.clear();
      return;
    }

    const prefix = `${taskId}\u0000`;
    const exact = inputs === undefined ? undefined : `${prefix}${stableInput(inputs)}`;
    for (const key of this.results.keys()) {
      if (exact ? key === exact : key.startsWith(prefix)) this.results.delete(key);
    }
    for (const key of this.pending.keys()) {
      if (exact ? key === exact : key.startsWith(prefix)) this.pending.delete(key);
    }
    if (!exact) this.latestKeys.delete(taskId);
  }

  private async runSelected(
    context: TContext,
    requestedIds: readonly string[] | undefined,
    options: ListPreparationRunOptions,
  ): Promise<ReadonlyMap<string, unknown>> {
    const runResults = new Map<string, unknown>();
    for (const task of orderPreparationTasks(this.tasks, requestedIds)) {
      if (options.signal?.aborted) {
        throw new ListPreparationAbortedError(task.id);
      }
      const result = await this.execute(task, context, runResults, options);
      runResults.set(task.id, result);
    }
    return runResults;
  }

  private execute(
    task: ListPreparationTask<TContext>,
    context: TContext,
    runResults: ReadonlyMap<string, unknown>,
    options: ListPreparationRunOptions,
  ): Promise<unknown> {
    const cache = typeof task.cache === 'object' ? task.cache : undefined;
    const policy: ListPreparationCachePolicy =
      cache?.policy
      ?? (typeof task.cache === 'string' ? task.cache : undefined)
      ?? task.cachePolicy
      ?? 'none';
    const readInputs = cache?.inputs ?? task.invalidationInputs ?? task.inputs;
    const inputKey = policy === 'byInputs' || readInputs
      ? stableInput(readInputs?.(context))
      : '';
    const key = `${task.id}\u0000${inputKey}`;

    const previousKey = this.latestKeys.get(task.id);
    if (previousKey && previousKey !== key) this.results.delete(previousKey);
    this.latestKeys.set(task.id, key);

    if (!options.force && policy !== 'none' && this.results.has(key)) {
      return Promise.resolve(this.results.get(key));
    }
    const inFlight = this.pending.get(key);
    if (inFlight) return abortable(inFlight, options.signal, task.id);

    let request: Promise<unknown>;
    request = abortable(
      Promise.resolve().then(() =>
        task.run(
          context,
          options.signal,
          {
            signal: options.signal,
            results: runResults,
          },
        ),
      ),
      options.signal,
      task.id,
    )
      .then(result => {
        if (policy !== 'none' && this.pending.get(key) === request) {
          this.results.set(key, result);
        }
        for (const invalidated of task.invalidates ?? []) {
          this.invalidate(invalidated);
        }
        return result;
      })
      .catch(error => {
        if (error instanceof ListPreparationError) throw error;
        throw new ListPreparationTaskError(task.id, error);
      })
      .finally(() => {
        if (this.pending.get(key) === request) this.pending.delete(key);
      });
    this.pending.set(key, request);
    return request;
  }
}
