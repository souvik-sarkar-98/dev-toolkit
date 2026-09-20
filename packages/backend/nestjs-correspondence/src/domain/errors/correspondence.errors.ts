import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class NotificationNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`Notification '${id}' not found.`, 'NOTIFICATION_NOT_FOUND', 404);
  }
}

export class UserNotificationNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`UserNotification '${id}' not found.`, 'USER_NOTIFICATION_NOT_FOUND', 404);
  }
}

export class SubscriptionNotFoundError extends BusinessError {
  constructor(id: string) {
    super(`Subscription '${id}' not found.`, 'SUBSCRIPTION_NOT_FOUND', 404);
  }
}

export class TemplateNotFoundError extends BusinessError {
  constructor(key: string) {
    super(`Template '${key}' not found or is invalid.`, 'TEMPLATE_NOT_FOUND', 404);
  }
}

export class NotificationAlreadyReadError extends BusinessError {
  constructor(id: string) {
    super(`Notification '${id}' has already been read.`, 'NOTIFICATION_ALREADY_READ', 400);
  }
}

export class NotificationAlreadyArchivedError extends BusinessError {
  constructor(id: string) {
    super(`Notification '${id}' has already been archived.`, 'NOTIFICATION_ALREADY_ARCHIVED', 400);
  }
}

export class TokenNotAvailableError extends BusinessError {
  constructor(provider: string = 'gmail') {
    super(
      `OAuth token for '${provider}' is not available. Falling back to SMTP.`,
      'TOKEN_NOT_AVAILABLE',
      503,
    );
  }
}

export class EmailDeliveryFailedError extends BusinessError {
  constructor(reason: string) {
    super(`Email delivery failed: ${reason}`, 'EMAIL_DELIVERY_FAILED', 502);
  }
}
