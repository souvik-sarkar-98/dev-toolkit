import { describe, expect, it, vi } from 'vitest';
import {
  MentionAutocompleteController,
  mentionCommandFromKey,
} from './mention-autocomplete.js';

describe('mentionCommandFromKey', () => {
  it('maps browser keys to framework-neutral commands', () => {
    expect(mentionCommandFromKey('ArrowDown')).toBe('next');
    expect(mentionCommandFromKey('ArrowUp')).toBe('prev');
    expect(mentionCommandFromKey('Enter')).toBe('confirm');
    expect(mentionCommandFromKey('Tab')).toBe('confirm');
    expect(mentionCommandFromKey('Escape')).toBe('dismiss');
    expect(mentionCommandFromKey('a')).toBeNull();
  });
});

describe('MentionAutocompleteController', () => {
  const immediateDelay = (_ms: number, cb: () => void) => {
    cb();
    return () => undefined;
  };

  it('debounces search and ignores stale responses', async () => {
    let resolveFirst!: (value: { userId: string; displayName: string; email: string }[]) => void;
    const first = new Promise<{ userId: string; displayName: string; email: string }[]>((resolve) => {
      resolveFirst = resolve;
    });
    const searchUsers = vi.fn((query: string) => {
      if (query === 'al') return first;
      return Promise.resolve([{ userId: '2', displayName: 'Alexa', email: '' }]);
    });

    const controller = new MentionAutocompleteController({
      searchUsers,
      debounceMs: 0,
      delay: immediateDelay,
    });

    controller.setQuery('al');
    controller.setQuery('alex');
    await Promise.resolve();
    resolveFirst([{ userId: '1', displayName: 'Alan', email: '' }]);
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.getState().candidates).toEqual([{ userId: '2', displayName: 'Alexa', email: '' }]);
  });

  it('confirm selects the active candidate', async () => {
    const controller = new MentionAutocompleteController({
      searchUsers: () => [
        { userId: '1', displayName: 'Ann', email: '' },
        { userId: '2', displayName: 'Bob', email: '' },
      ],
      delay: immediateDelay,
      debounceMs: 0,
    });
    controller.setQuery('a');
    await Promise.resolve();
    controller.handleCommand('next');
    const result = controller.handleCommand('confirm');
    expect(result.selected?.userId).toBe('2');
    expect(result.consumed).toBe(true);
  });
});
