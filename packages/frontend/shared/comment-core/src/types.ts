/** Matches nestjs-shared-comment MentionInput / MentionDto at write time. */
export interface MentionInput {
  userId: string;
  displayName: string;
  email: string;
}

export interface CommentMentionSummary {
  userId: string;
  displayName: string;
}

/** Value produced by mention-capable editors (canonical content uses @[userId] tokens). */
export interface CommentEditorValue {
  content: string;
  mentions: MentionInput[];
}

export interface CreateCommentPayload {
  content: string;
  entityType: string;
  entityId: string;
  parentId?: string;
  mentions: MentionInput[];
}

export interface UpdateCommentPayload {
  content: string;
  mentions: MentionInput[];
}

/** User row shown in the @-mention picker (app supplies via searchUsers). */
export interface MentionCandidate extends MentionInput {}

export type MentionUserSearch = (
  query: string,
) => MentionCandidate[] | Promise<MentionCandidate[]>;
