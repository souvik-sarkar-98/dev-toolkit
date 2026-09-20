import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { MentionCandidate, MentionUserSearch } from '@ssdev-toolkit/comment-core';
import { getActiveMentionQuery } from '@ssdev-toolkit/comment-core';

export interface UseMentionAutocompleteOptions {
  editableText: string;
  cursor: number;
  searchUsers: MentionUserSearch;
  minQueryLength?: number;
  debounceMs?: number;
}

export interface UseMentionAutocompleteResult {
  open: boolean;
  query: string | null;
  candidates: MentionCandidate[];
  loading: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  selectCandidate: (candidate: MentionCandidate) => void;
  listboxId: string;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

export function useMentionAutocomplete(
  options: UseMentionAutocompleteOptions,
  onSelect: (candidate: MentionCandidate) => void,
): UseMentionAutocompleteResult {
  const { editableText, cursor, searchUsers, minQueryLength = 0, debounceMs = 200 } = options;
  const listboxId = useId();
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestRef = useRef(0);

  const query = getActiveMentionQuery(editableText, cursor);
  const open = query !== null;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, candidates.length]);

  useEffect(() => {
    if (!open || query === null) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    if (query.length < minQueryLength) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);

    const timer = window.setTimeout(() => {
      void Promise.resolve(searchUsers(query))
        .then((results) => {
          if (requestRef.current !== requestId) return;
          setCandidates(results);
        })
        .finally(() => {
          if (requestRef.current === requestId) {
            setLoading(false);
          }
        });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [open, query, searchUsers, minQueryLength, debounceMs]);

  const selectCandidate = useCallback(
    (candidate: MentionCandidate) => {
      onSelect(candidate);
      setCandidates([]);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!open || candidates.length === 0) {
        return false;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % candidates.length);
        return true;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
        return true;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const candidate = candidates[activeIndex];
        if (candidate) {
          selectCandidate(candidate);
        }
        return true;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setCandidates([]);
        return true;
      }

      return false;
    },
    [open, candidates, activeIndex, selectCandidate],
  );

  return {
    open: open && (loading || candidates.length > 0 || (query?.length ?? 0) >= minQueryLength),
    query,
    candidates,
    loading,
    activeIndex,
    setActiveIndex,
    selectCandidate,
    listboxId,
    handleKeyDown,
  };
}

export function syncTextareaCursor(textareaRef: RefObject<HTMLTextAreaElement | null>, cursor: number) {
  const el = textareaRef.current;
  if (!el) return;
  el.focus();
  el.setSelectionRange(cursor, cursor);
}
