import { describe, expect, it, vi } from 'vitest';
import {
  ListPreparationAbortedError,
  ListPreparationCycleError,
  ListPreparationRunner,
  ListPreparationTaskError,
  orderPreparationTasks,
  runPreparationTasks,
  type ListPreparationTask,
} from './list-preparation.runtime.js';

describe('list preparation graph', () => {
  it('orders transitive dependencies before dependants', async () => {
    const calls: string[] = [];
    const task = (
      id: string,
      dependsOn: string[] = [],
    ): ListPreparationTask => ({
      id,
      dependsOn,
      run: () => calls.push(id),
    });
    const tasks = [
      task('options', ['permissions']),
      task('permissions'),
      task('form', ['options']),
      task('unrelated'),
    ];

    expect(orderPreparationTasks(tasks, ['form']).map(item => item.id)).toEqual([
      'permissions',
      'options',
      'form',
    ]);
    await runPreparationTasks(tasks, undefined, ['form']);
    expect(calls).toEqual(['permissions', 'options', 'form']);
  });

  it('uses trigger-specific roots', async () => {
    const calls: string[] = [];
    const runner = new ListPreparationRunner(
      [
        { id: 'shared', run: () => calls.push('shared') },
        {
          id: 'detail-data',
          dependsOn: ['shared'],
          run: () => calls.push('detail-data'),
        },
        { id: 'create-data', run: () => calls.push('create-data') },
      ],
      { detail: ['detail-data'] },
    );

    await runner.run('detail', undefined);
    expect(calls).toEqual(['shared', 'detail-data']);
  });

  it('detects dependency cycles', () => {
    expect(() =>
      orderPreparationTasks([
        { id: 'a', dependsOn: ['b'], run: () => undefined },
        { id: 'b', dependsOn: ['a'], run: () => undefined },
      ]),
    ).toThrow(ListPreparationCycleError);
  });

  it('supports plan triggers and caches/deduplicates by invalidation inputs', async () => {
    let release!: () => void;
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    const load = vi.fn(async (context: { revision: number }) => {
      await blocked;
      return context.revision;
    });
    const runner = new ListPreparationRunner(
      [{
        id: 'load',
        cache: 'byInputs',
        invalidationInputs: context => context.revision,
        run: load,
      }],
      {
        init: ['load'],
        filterOpen: ['load'],
        createOpen: ['load'],
        editPrepare: ['load'],
        operation: ['load'],
      },
    );

    const first = runner.run('init', { revision: 1 });
    const concurrent = runner.run('filterOpen', { revision: 1 });
    release();
    await Promise.all([first, concurrent]);
    await runner.run('createOpen', { revision: 1 });
    await runner.run('editPrepare', { revision: 2 });

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('supports explicit cache invalidation and task invalidates', async () => {
    const cached = vi.fn(() => 'cached');
    const runner = new ListPreparationRunner(
      [
        { id: 'cached', cache: 'instance', run: cached },
        {
          id: 'reset',
          invalidates: ['cached'],
          run: () => undefined,
        },
      ],
      {
        init: ['cached'],
        operation: ['reset'],
      },
    );

    await runner.run('init', undefined);
    await runner.run('init', undefined);
    runner.invalidate('cached');
    await runner.run('init', undefined);
    await runner.run('operation', undefined);
    await runner.run('init', undefined);

    expect(cached).toHaveBeenCalledTimes(3);
  });

  it('passes AbortSignal and rejects cancellation explicitly', async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const runner = new ListPreparationRunner(
      [{
        id: 'slow',
        run: (_context, signal) => {
          receivedSignal = signal;
          return new Promise(() => undefined);
        },
      }],
      { init: ['slow'] },
    );

    const result = runner.run('init', undefined, controller.signal);
    await Promise.resolve();
    controller.abort();

    await expect(result).rejects.toBeInstanceOf(ListPreparationAbortedError);
    expect(receivedSignal).toBe(controller.signal);
  });

  it('removes failed work from dedup state so it can be retried', async () => {
    const run = vi.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce('ready');
    const runner = new ListPreparationRunner(
      [{ id: 'retryable', cache: 'instance', run }],
      { init: ['retryable'] },
    );

    await expect(runner.run('init', undefined))
      .rejects.toBeInstanceOf(ListPreparationTaskError);
    await expect(runner.run('init', undefined)).resolves.toEqual(
      new Map([['retryable', 'ready']]),
    );
    expect(run).toHaveBeenCalledTimes(2);
  });
});
