/**
 * Outbound notification port owned by the comment context. The comment package
 * declares *what* happened; the host app provides an adapter that maps these to
 * concrete notifications (dependency inversion — comment stays core-only, with no
 * correspondence dependency).
 *
 * The adapter is optional: when no adapter is registered, comment notifications
 * are simply skipped.
 */

export interface CommentMentionNotification {
  commentId: string;
  entityType: string;
  entityId: string;
  authorName: string;
  mentionUserId: string;
  mentionEmail: string;
  mentionDisplayName: string;
}

export interface CommentAddedNotification {
  commentId: string;
  entityType: string;
  entityId: string;
  authorName: string;
  /** Author + mentioned users — they get dedicated notifications, not a subscriber alert. */
  excludeUserIds: string[];
}

export interface ICommentNotificationPort {
  notifyMention(data: CommentMentionNotification): Promise<void> | void;
  notifyCommentAdded(data: CommentAddedNotification): Promise<void> | void;
}

export const COMMENT_NOTIFICATION_PORT = Symbol('ICommentNotificationPort');
