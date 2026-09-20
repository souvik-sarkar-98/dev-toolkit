import {
  NotificationPriority,
  NotificationType,
} from '../../domain/enums/notification-type.enum';

/**
 * Shared correspondence vocabulary: recipient targeting and channel option shapes.
 * Owned by the correspondence context — used by NotificationSpec, the orchestrator,
 * subscription resolution, and host notification-policy descriptors.
 */

export interface NotificationAction {
  url?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface TargetUsersRecipients {
  mode: 'users';
  userIds: string[];
}

export interface TargetRolesRecipients {
  mode: 'roles';
  roleNames: string[];
}

export interface TargetResourceRecipients {
  mode: 'resource';
  referenceType: string;
  referenceId?: string;
  excludeUserIds?: string[];
}

export type CorrespondenceRecipients =
  | TargetUsersRecipients
  | TargetRolesRecipients
  | TargetResourceRecipients;

export interface InAppChannelOptions {
  title: string;
  body: string;
  type: NotificationType;
  category: string;
  priority?: NotificationPriority;
  action?: NotificationAction;
  referenceId?: string;
  referenceType?: string;
  imageUrl?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface EmailChannelOptions {
  templateKey: string;
  overrideEmails?: string[];
  cc?: string[];
  templateData?: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
}

export interface PushChannelOptions {
  enabled: boolean;
}

export type CorrespondenceChannels =
  | { inApp: InAppChannelOptions; email?: EmailChannelOptions; push?: PushChannelOptions }
  | { inApp?: never; email: EmailChannelOptions; push?: never };
