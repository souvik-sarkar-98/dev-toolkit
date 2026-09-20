export interface PushNotificationPayload {
  /** OneSignal external user IDs to target */
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  icon?: string;
}

export interface IPushNotificationPort {
  send(payload: PushNotificationPayload): Promise<void>;
}

export const IPushNotificationPort = Symbol('IPushNotificationPort');
