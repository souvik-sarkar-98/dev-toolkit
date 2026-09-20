export interface EntityTypeConfig {
  entityType: string;
  /** User needs AT LEAST ONE of these to read comments on this entity type. */
  readPermissions?: string[];
  /** User needs AT LEAST ONE of these to write/delete comments on this entity type. */
  writePermissions?: string[];
}

export type { EntityTypeConfig as EntityTypeAccessConfig };

export interface CommentNotificationOptions {
  /**
   * When false, subscriber notifications (comment-added fan-out) are suppressed
   * entirely — the outbound notification port is not called. Defaults to true.
   *
   * Notification wording, template keys, and channels are owned by the host
   * adapter implementing ICommentNotificationPort, not by this module.
   */
  notifySubscribers?: boolean;
}

export interface CommentModuleOptions {
  /**
   * Every entity type the comment module will serve must be listed here.
   * Requests for unlisted entity types are rejected with 403.
   * To allow all entity types without permission checks, provide an empty array or omit.
   */
  allowedEntityTypes: EntityTypeConfig[];
  /**
   * Correspondence notification settings. When omitted, defaults apply.
   */
  notifications?: CommentNotificationOptions;
}
