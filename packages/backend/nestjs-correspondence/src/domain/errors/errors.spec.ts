/**
 * Domain errors — HTTP status code & message tests.
 * Pure unit tests, no framework imports.
 */
import {
  NotificationNotFoundError,
  UserNotificationNotFoundError,
  SubscriptionNotFoundError,
  TemplateNotFoundError,
  NotificationAlreadyReadError,
  NotificationAlreadyArchivedError,
  TokenNotAvailableError,
  EmailDeliveryFailedError,
} from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';

describe('Domain errors', () => {
  describe('NotificationNotFoundError', () => {
    it('has statusCode 404', () => {
      expect(new NotificationNotFoundError('id-1').statusCode).toBe(404);
    });

    it('message contains the id', () => {
      expect(new NotificationNotFoundError('id-1').message).toContain('id-1');
    });

    it('has errorCode NOTIFICATION_NOT_FOUND', () => {
      expect(new NotificationNotFoundError('x').errorCode).toBe('NOTIFICATION_NOT_FOUND');
    });
  });

  describe('UserNotificationNotFoundError', () => {
    it('has statusCode 404', () => {
      expect(new UserNotificationNotFoundError('un-1').statusCode).toBe(404);
    });

    it('message contains the id', () => {
      expect(new UserNotificationNotFoundError('un-1').message).toContain('un-1');
    });

    it('has errorCode USER_NOTIFICATION_NOT_FOUND', () => {
      expect(new UserNotificationNotFoundError('x').errorCode).toBe('USER_NOTIFICATION_NOT_FOUND');
    });
  });

  describe('SubscriptionNotFoundError', () => {
    it('has statusCode 404', () => {
      expect(new SubscriptionNotFoundError('sub-1').statusCode).toBe(404);
    });

    it('message contains the id', () => {
      expect(new SubscriptionNotFoundError('sub-1').message).toContain('sub-1');
    });

    it('has errorCode SUBSCRIPTION_NOT_FOUND', () => {
      expect(new SubscriptionNotFoundError('x').errorCode).toBe('SUBSCRIPTION_NOT_FOUND');
    });
  });

  describe('TemplateNotFoundError', () => {
    it('has statusCode 404', () => {
      expect(new TemplateNotFoundError('welcome').statusCode).toBe(404);
    });

    it('message contains the template key', () => {
      expect(new TemplateNotFoundError('welcome').message).toContain('welcome');
    });

    it('has errorCode TEMPLATE_NOT_FOUND', () => {
      expect(new TemplateNotFoundError('x').errorCode).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('NotificationAlreadyReadError', () => {
    it('has statusCode 400', () => {
      expect(new NotificationAlreadyReadError('id-1').statusCode).toBe(400);
    });

    it('message contains the id', () => {
      expect(new NotificationAlreadyReadError('id-1').message).toContain('id-1');
    });

    it('has errorCode NOTIFICATION_ALREADY_READ', () => {
      expect(new NotificationAlreadyReadError('x').errorCode).toBe('NOTIFICATION_ALREADY_READ');
    });
  });

  describe('NotificationAlreadyArchivedError', () => {
    it('has statusCode 400', () => {
      expect(new NotificationAlreadyArchivedError('id-1').statusCode).toBe(400);
    });

    it('message contains the id', () => {
      expect(new NotificationAlreadyArchivedError('id-1').message).toContain('id-1');
    });

    it('has errorCode NOTIFICATION_ALREADY_ARCHIVED', () => {
      expect(new NotificationAlreadyArchivedError('x').errorCode).toBe(
        'NOTIFICATION_ALREADY_ARCHIVED',
      );
    });
  });

  describe('TokenNotAvailableError', () => {
    it('has statusCode 503', () => {
      expect(new TokenNotAvailableError().statusCode).toBe(503);
    });

    it('defaults provider to gmail in message', () => {
      expect(new TokenNotAvailableError().message).toContain('gmail');
    });

    it('uses custom provider in message', () => {
      expect(new TokenNotAvailableError('microsoft').message).toContain('microsoft');
    });

    it('has errorCode TOKEN_NOT_AVAILABLE', () => {
      expect(new TokenNotAvailableError().errorCode).toBe('TOKEN_NOT_AVAILABLE');
    });
  });

  describe('EmailDeliveryFailedError', () => {
    it('has statusCode 502', () => {
      expect(new EmailDeliveryFailedError('timeout').statusCode).toBe(502);
    });

    it('message contains the reason', () => {
      expect(new EmailDeliveryFailedError('timeout').message).toContain('timeout');
    });

    it('has errorCode EMAIL_DELIVERY_FAILED', () => {
      expect(new EmailDeliveryFailedError('x').errorCode).toBe('EMAIL_DELIVERY_FAILED');
    });
  });
});
