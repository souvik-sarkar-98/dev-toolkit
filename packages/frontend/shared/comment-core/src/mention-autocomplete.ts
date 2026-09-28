import type { MentionCandidate, MentionUserSearch } from './types.js';

export type DelayHandle = () => void;
export type DelayFn = (ms: number, callback: () => void) => DelayHandle;

export const defaultDelay: DelayFn = (ms, callback) => {
  const timer = setTimeout(callback, ms);
  return () => clearTimeout(timer);
};

export type MentionKeyCommand = 'next' | 'prev' | 'confirm' | 'dismiss';

export function mentionCommandFromKey(key: string): MentionKeyCommand | null {
  switch (key) {
    case 'ArrowDown':
      return 'next';
    case 'ArrowUp':
      return 'prev';
    case 'Enter':
    case 'Tab':
      return 'confirm';
    case 'Escape':
      return 'dismiss';
    default:
      return null;
  }
}

export interface MentionAutocompleteState {
  query: string | null;
  open: boolean;
  candidates: MentionCandidate[];
  loading: boolean;
  activeIndex: number;
}

export interface MentionCommandResult {
  consumed: boolean;
  selected?: MentionCandidate;
  state: MentionAutocompleteState;
}

export interface MentionAutocompleteOptions {
  searchUsers: MentionUserSearch;
  minQueryLength?: number;
  debounceMs?: number;
  delay?: DelayFn;
  onChange?: (state: MentionAutocompleteState) => void;
}

function emptyState(query: string | null = null): MentionAutocompleteState {
  return { query, open: false, candidates: [], loading: false, activeIndex: 0 };
}

export class MentionAutocompleteController {
  private state: MentionAutocompleteState = emptyState();
  private requestId = 0;
  private cancelDelay?: DelayHandle;
  private readonly minQueryLength: number;
  private readonly debounceMs: number;
  private readonly delay: DelayFn;
  private readonly searchUsers: MentionUserSearch;
  private readonly onChange?: (state: MentionAutocompleteState) => void;

  constructor(options: MentionAutocompleteOptions) {
    this.searchUsers = options.searchUsers;
    this.minQueryLength = options.minQueryLength ?? 0;
    this.debounceMs = options.debounceMs ?? 200;
    this.delay = options.delay ?? defaultDelay;
    this.onChange = options.onChange;
  }

  getState(): MentionAutocompleteState {
    return { ...this.state, candidates: [...this.state.candidates] };
  }

  setQuery(query: string | null): void {
    this.cancelDelay?.();
    this.cancelDelay = undefined;

    if (query === null || query.length < this.minQueryLength) {
      this.requestId += 1;
      this.state = {
        query,
        open: query !== null,
        candidates: [],
        loading: false,
        activeIndex: 0,
      };
      this.emit();
      return;
    }

    const requestId = ++this.requestId;
    this.state = {
      query,
      open: true,
      candidates: this.state.candidates,
      loading: true,
      activeIndex: 0,
    };
    this.emit();

    this.cancelDelay = this.delay(this.debounceMs, () => {
      void Promise.resolve(this.searchUsers(query))
        .then((results) => {
          if (requestId !== this.requestId) return;
          this.state = {
            query,
            open: true,
            candidates: results,
            loading: false,
            activeIndex: 0,
          };
          this.emit();
        })
        .catch(() => {
          if (requestId !== this.requestId) return;
          this.state = {
            query,
            open: true,
            candidates: [],
            loading: false,
            activeIndex: 0,
          };
          this.emit();
        });
    });
  }

  handleCommand(command: MentionKeyCommand): MentionCommandResult {
    if (!this.state.open || this.state.candidates.length === 0) {
      return { consumed: false, state: this.getState() };
    }

    if (command === 'next') {
      this.state = {
        ...this.state,
        activeIndex: (this.state.activeIndex + 1) % this.state.candidates.length,
      };
      this.emit();
      return { consumed: true, state: this.getState() };
    }

    if (command === 'prev') {
      this.state = {
        ...this.state,
        activeIndex:
          (this.state.activeIndex - 1 + this.state.candidates.length)
          % this.state.candidates.length,
      };
      this.emit();
      return { consumed: true, state: this.getState() };
    }

    if (command === 'confirm') {
      const selected = this.state.candidates[this.state.activeIndex];
      this.dismiss();
      return { consumed: true, selected, state: this.getState() };
    }

    this.dismiss();
    return { consumed: true, state: this.getState() };
  }

  selectCandidate(_candidate: MentionCandidate): MentionAutocompleteState {
    this.dismiss();
    return this.getState();
  }

  dispose(): void {
    this.cancelDelay?.();
    this.requestId += 1;
  }

  private dismiss(): void {
    this.requestId += 1;
    this.cancelDelay?.();
    this.state = {
      ...this.state,
      candidates: [],
      loading: false,
      open: false,
    };
    this.emit();
  }

  private emit(): void {
    this.onChange?.(this.getState());
  }
}
