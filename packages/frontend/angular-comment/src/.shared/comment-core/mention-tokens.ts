import type {
  CommentEditorValue,
  CommentMentionSummary,
  CreateCommentPayload,
  MentionInput,
  UpdateCommentPayload,
} from './types.js';

/** Same token format validated server-side in nestjs-shared-comment Comment aggregate. */
export const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]/g;

export function mentionToken(userId: string): string {
  return `@[${userId}]`;
}

export function parseMentionedUserIds(content: string): Set<string> {
  const ids = new Set<string>();
  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    ids.add(match[1]!);
  }
  return ids;
}

export function deduplicateMentions(mentions: readonly MentionInput[]): MentionInput[] {
  return [...new Map(mentions.map((m) => [m.userId, m])).values()];
}

/** Keep only mentions whose userId appears as @[userId] in content. */
export function syncMentionsWithContent(
  content: string,
  mentions: readonly MentionInput[],
): MentionInput[] {
  const ids = parseMentionedUserIds(content);
  return deduplicateMentions(mentions.filter((m) => ids.has(m.userId)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace @[userId] tokens with @DisplayName for in-editor display. */
export function contentToEditableText(
  content: string,
  mentions: readonly Pick<MentionInput, 'userId' | 'displayName'>[],
): string {
  const byId = new Map(mentions.map((m) => [m.userId, m.displayName]));
  return content.replace(MENTION_TOKEN_REGEX, (_, userId: string) => {
    const name = byId.get(userId);
    return name ? `@${name}` : `@${userId}`;
  });
}

/** Convert @DisplayName segments back to @[userId] using the known mention list. */
export function editableTextToContent(
  editableText: string,
  mentions: readonly MentionInput[],
): string {
  let result = editableText;
  const sorted = [...mentions].sort((a, b) => b.displayName.length - a.displayName.length);
  for (const mention of sorted) {
    const pattern = new RegExp(`@${escapeRegExp(mention.displayName)}(?=\\s|$|[.,!?;:])`, 'g');
    result = result.replace(pattern, mentionToken(mention.userId));
  }
  return result;
}

export function buildCommentEditorValue(
  editableText: string,
  mentions: readonly MentionInput[],
): CommentEditorValue {
  const content = editableTextToContent(editableText, mentions);
  return {
    content,
    mentions: syncMentionsWithContent(content, mentions),
  };
}

export function insertMentionInEditableText(
  editableText: string,
  cursor: number,
  mention: MentionInput,
): { text: string; cursor: number } {
  const before = editableText.slice(0, cursor);
  const after = editableText.slice(cursor);
  const atMatch = before.match(/@([^\s@]*)$/);
  const replaceFrom = atMatch ? before.length - atMatch[0].length : cursor;
  const prefix = editableText.slice(0, replaceFrom);
  const insert = `@${mention.displayName} `;
  const text = `${prefix}${insert}${after}`;
  return {
    text,
    cursor: prefix.length + insert.length,
  };
}

export function getActiveMentionQuery(editableText: string, cursor: number): string | null {
  const before = editableText.slice(0, cursor);
  const match = before.match(/@([^\s@[\]]*)$/);
  return match ? match[1]! : null;
}

export interface ContentSegment {
  type: 'text' | 'mention';
  text: string;
  userId?: string;
}

/** Split stored content into plain text and mention segments for read-only rendering. */
export function parseContentSegments(
  content: string,
  mentions: readonly CommentMentionSummary[],
): ContentSegment[] {
  const byId = new Map(mentions.map((m) => [m.userId, m.displayName]));
  const segments: ContentSegment[] = [];
  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ type: 'text', text: content.slice(lastIndex, start) });
    }
    const userId = match[1]!;
    const label = byId.get(userId) ?? userId;
    segments.push({ type: 'mention', text: `@${label}`, userId });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', text: content.slice(lastIndex) });
  }

  return segments;
}

export function toCreateCommentPayload(
  value: CommentEditorValue,
  entityType: string,
  entityId: string,
  parentId?: string,
): CreateCommentPayload {
  return {
    content: value.content,
    entityType,
    entityId,
    parentId,
    mentions: value.mentions,
  };
}

export function toUpdateCommentPayload(value: CommentEditorValue): UpdateCommentPayload {
  return {
    content: value.content,
    mentions: value.mentions,
  };
}
