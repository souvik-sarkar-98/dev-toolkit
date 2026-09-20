export type {
  CommentEditorValue,
  CommentMentionSummary,
  CreateCommentPayload,
  MentionCandidate,
  MentionInput,
  MentionUserSearch,
  UpdateCommentPayload,
} from './types.js';

export {
  MENTION_TOKEN_REGEX,
  buildCommentEditorValue,
  contentToEditableText,
  deduplicateMentions,
  editableTextToContent,
  getActiveMentionQuery,
  insertMentionInEditableText,
  mentionToken,
  parseContentSegments,
  parseMentionedUserIds,
  syncMentionsWithContent,
  toCreateCommentPayload,
  toUpdateCommentPayload,
} from './mention-tokens.js';

export type { ContentSegment } from './mention-tokens.js';
