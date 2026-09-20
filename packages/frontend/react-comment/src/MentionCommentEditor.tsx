import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TextareaHTMLAttributes,
} from 'react';
import type { CommentEditorValue, MentionCandidate, MentionUserSearch } from '@ssdev-toolkit/comment-core';
import {
  buildCommentEditorValue,
  contentToEditableText,
  deduplicateMentions,
  insertMentionInEditableText,
} from '@ssdev-toolkit/comment-core';
import { CommentContent } from './CommentContent.js';
import { syncTextareaCursor, useMentionAutocomplete } from './useMentionAutocomplete.js';

export interface MentionCommentEditorClassNames {
  root?: string;
  textarea?: string;
  mentionList?: string;
  mentionOption?: string;
  mentionOptionActive?: string;
  preview?: string;
}

export interface MentionCommentEditorProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'defaultValue'> {
  value: CommentEditorValue;
  onChange: (value: CommentEditorValue) => void;
  searchUsers: MentionUserSearch;
  minMentionQueryLength?: number;
  showPreview?: boolean;
  classNames?: MentionCommentEditorClassNames;
  mentionListLabel?: string;
}

export function MentionCommentEditor({
  value,
  onChange,
  searchUsers,
  minMentionQueryLength = 1,
  showPreview = false,
  classNames,
  mentionListLabel = 'Mention suggestions',
  placeholder = 'Write a comment… Use @ to mention someone',
  rows = 4,
  ...textareaProps
}: MentionCommentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);

  const editableText = contentToEditableText(value.content, value.mentions);

  const emitFromEditable = useCallback(
    (nextEditable: string, mentionList = value.mentions) => {
      onChange(buildCommentEditorValue(nextEditable, mentionList));
    },
    [onChange, value.mentions],
  );

  const onMentionSelect = useCallback(
    (candidate: MentionCandidate) => {
      const result = insertMentionInEditableText(editableText, cursor, candidate);
      const nextMentions = deduplicateMentions([
        ...value.mentions.filter((m) => m.userId !== candidate.userId),
        candidate,
      ]);
      onChange(buildCommentEditorValue(result.text, nextMentions));
      setCursor(result.cursor);
      syncTextareaCursor(textareaRef, result.cursor);
    },
    [cursor, editableText, onChange, value.mentions],
  );

  const autocomplete = useMentionAutocomplete(
    {
      editableText,
      cursor,
      searchUsers,
      minQueryLength: minMentionQueryLength,
    },
    onMentionSelect,
  );

  const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    const nextCursor = event.target.selectionStart ?? next.length;
    setCursor(nextCursor);
    emitFromEditable(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete.handleKeyDown(event)) {
      return;
    }
    textareaProps.onKeyDown?.(event);
  };

  const onSelect = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setCursor(event.target.selectionStart ?? 0);
    textareaProps.onSelect?.(event);
  };

  const onClick = (event: MouseEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    setCursor(target.selectionStart ?? 0);
    textareaProps.onClick?.(event);
  };

  const previewMentions = useMemo(
    () => value.mentions.map((m) => ({ userId: m.userId, displayName: m.displayName })),
    [value.mentions],
  );

  return (
    <div className={classNames?.root} data-mention-editor>
      <textarea
        {...textareaProps}
        ref={textareaRef}
        className={classNames?.textarea}
        value={editableText}
        rows={rows}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-controls={autocomplete.open ? autocomplete.listboxId : undefined}
        aria-expanded={autocomplete.open}
        onChange={onTextChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        onClick={onClick}
      />

      {autocomplete.open ? (
        <ul
          id={autocomplete.listboxId}
          className={classNames?.mentionList}
          role="listbox"
          aria-label={mentionListLabel}
        >
          {autocomplete.loading ? (
            <li role="option" aria-disabled="true">
              Searching…
            </li>
          ) : null}
          {!autocomplete.loading && autocomplete.candidates.length === 0 ? (
            <li role="option" aria-disabled="true">
              No people found
            </li>
          ) : null}
          {autocomplete.candidates.map((candidate, index) => {
            const active = index === autocomplete.activeIndex;
            return (
              <li
                key={candidate.userId}
                role="option"
                aria-selected={active}
                className={
                  active
                    ? [classNames?.mentionOption, classNames?.mentionOptionActive]
                        .filter(Boolean)
                        .join(' ')
                    : classNames?.mentionOption
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  autocomplete.selectCandidate(candidate);
                }}
                onMouseEnter={() => autocomplete.setActiveIndex(index)}
              >
                <span>{candidate.displayName}</span>
                {candidate.email ? <span>{candidate.email}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {showPreview ? (
        <div className={classNames?.preview} aria-live="polite">
          <CommentContent content={value.content} mentions={previewMentions} />
        </div>
      ) : null}
    </div>
  );
}

export { CommentContent } from './CommentContent.js';
export type { CommentContentClassNames, CommentContentProps } from './CommentContent.js';
