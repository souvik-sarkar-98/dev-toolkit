'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { MentionCandidate, MentionUserSearch } from '@ssdev-toolkit/comment-core';
import {
  MentionAutocompleteController,
  getActiveMentionQuery,
  mentionCommandFromKey,
} from '@ssdev-toolkit/comment-core';

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
  const [state, setState] = useState(() => ({
    open: false,
    query: null as string | null,
    candidates: [] as MentionCandidate[],
    loading: false,
    activeIndex: 0,
  }));
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const controllerRef = useRef<MentionAutocompleteController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new MentionAutocompleteController({
      searchUsers,
      minQueryLength,
      debounceMs,
      onChange: setState,
    });
  }

  useEffect(() => {
    controllerRef.current?.dispose();
    controllerRef.current = new MentionAutocompleteController({
      searchUsers,
      minQueryLength,
      debounceMs,
      onChange: setState,
    });
  }, [searchUsers, minQueryLength, debounceMs]);

  const query = getActiveMentionQuery(editableText, cursor);

  useEffect(() => {
    controllerRef.current?.setQuery(query);
  }, [query]);

  useEffect(() => () => controllerRef.current?.dispose(), []);

  const selectCandidate = useCallback((candidate: MentionCandidate) => {
    controllerRef.current?.selectCandidate(candidate);
    onSelectRef.current(candidate);
  }, []);

  const setActiveIndex = useCallback((index: number) => {
    const current = controllerRef.current?.getState();
    if (!current) return;
    const delta = index - current.activeIndex;
    if (delta > 0) {
      for (let i = 0; i < delta; i += 1) controllerRef.current?.handleCommand('next');
    } else if (delta < 0) {
      for (let i = 0; i > delta; i -= 1) controllerRef.current?.handleCommand('prev');
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    const command = mentionCommandFromKey(event.key);
    if (!command) return false;
    const result = controllerRef.current?.handleCommand(command);
    if (!result?.consumed) return false;
    event.preventDefault();
    if (result.selected) {
      onSelectRef.current(result.selected);
    }
    return true;
  }, []);

  const snapshot = controllerRef.current?.getState() ?? state;
  const open =
    snapshot.open
    && (snapshot.loading
      || snapshot.candidates.length > 0
      || (snapshot.query?.length ?? 0) >= minQueryLength);

  return {
    open,
    query: snapshot.query,
    candidates: snapshot.candidates,
    loading: snapshot.loading,
    activeIndex: snapshot.activeIndex,
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
