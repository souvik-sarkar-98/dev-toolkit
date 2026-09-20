export interface CorrespondenceDispatchPayload {
  dispatchId: string;
  notificationId?: string;
  targetUserIds: string[];
  /** IDs of UserNotification records created for in-app channel — used by bulkMarkPushSent */
  userNotificationIds?: string[];
  /** User IDs that opted in to the push channel — subset of targetUserIds */
  pushUserIds?: string[];
  templateKey?: string;
  templateData?: Record<string, any>;
  subject?: string;
  emailAddresses?: string[];
  ccAddresses?: string[];
  sendEmail: boolean;
  sendPush: boolean;
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
}

export interface IDispatchQueuePort {
  enqueue(payload: CorrespondenceDispatchPayload): Promise<void>;
}

export const IDispatchQueuePort = Symbol('IDispatchQueuePort');
