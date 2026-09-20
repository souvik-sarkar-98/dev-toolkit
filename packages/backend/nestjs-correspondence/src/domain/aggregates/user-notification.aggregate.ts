import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { UserNotificationReadEvent, type UserNotificationReadSnapshot } from '../events/user-notification-read.event';
import { UserNotificationArchivedEvent, type UserNotificationArchivedSnapshot } from '../events/user-notification-archived.event';
import { NotificationPushDeliveredEvent, type NotificationPushDeliveredSnapshot } from '../events/notification-push-delivered.event';
import { NotificationAlreadyReadError, NotificationAlreadyArchivedError } from '../errors/correspondence.errors';

export interface UserNotificationFilter {
  userId?: string;
  notificationId?: string;
  isRead?: boolean;
  isArchived?: boolean;
  isPushSent?: boolean;
  pushDelivered?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export class UserNotification extends AggregateRoot<string> {
  #notificationId: string;
  #userId: string;
  #isRead: boolean;
  #readAt?: Date;
  #isArchived: boolean;
  #archivedAt?: Date;
  #isPushSent: boolean;
  #pushSentAt?: Date;
  #pushDelivered: boolean;
  #pushError?: string;

  constructor(
    id: string,
    notificationId: string,
    userId: string,
    options?: {
      isRead?: boolean;
      readAt?: Date;
      isArchived?: boolean;
      archivedAt?: Date;
      isPushSent?: boolean;
      pushSentAt?: Date;
      pushDelivered?: boolean;
      pushError?: string;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    super(id, options?.createdAt, options?.updatedAt);
    this.#notificationId = notificationId;
    this.#userId = userId;
    this.#isRead = options?.isRead ?? false;
    this.#readAt = options?.readAt;
    this.#isArchived = options?.isArchived ?? false;
    this.#archivedAt = options?.archivedAt;
    this.#isPushSent = options?.isPushSent ?? false;
    this.#pushSentAt = options?.pushSentAt;
    this.#pushDelivered = options?.pushDelivered ?? false;
    this.#pushError = options?.pushError;
  }

  static create(op: {
    notificationId: string;
    userId: string;
  }): UserNotification {
    return new UserNotification(randomUUID(), op.notificationId, op.userId);
  }

  markAsRead(): void {
    if (this.#isRead) {
      throw new NotificationAlreadyReadError(this.id);
    }
    this.#isRead = true;
    this.#readAt = new Date();
    this.touch();
    this.addDomainEvent(new UserNotificationReadEvent(this.toSnapshot<UserNotificationReadSnapshot>()));
  }

  archive(): void {
    if (this.#isArchived) {
      throw new NotificationAlreadyArchivedError(this.id);
    }
    this.#isArchived = true;
    this.#archivedAt = new Date();
    this.touch();
    this.addDomainEvent(new UserNotificationArchivedEvent(this.toSnapshot<UserNotificationArchivedSnapshot>()));
  }

  markPushDelivered(success: boolean, error?: string): void {
    this.#isPushSent = true;
    this.#pushSentAt = new Date();
    this.#pushDelivered = success;
    this.#pushError = error;
    this.touch();
    this.addDomainEvent(new NotificationPushDeliveredEvent(this.toSnapshot<NotificationPushDeliveredSnapshot>()));
  }

  get notificationId(): string { return this.#notificationId; }
  get userId(): string { return this.#userId; }
  get isRead(): boolean { return this.#isRead; }
  get readAt(): Date | undefined { return this.#readAt; }
  get isArchived(): boolean { return this.#isArchived; }
  get archivedAt(): Date | undefined { return this.#archivedAt; }
  get isPushSent(): boolean { return this.#isPushSent; }
  get pushSentAt(): Date | undefined { return this.#pushSentAt; }
  get pushDelivered(): boolean { return this.#pushDelivered; }
  get pushError(): string | undefined { return this.#pushError; }
}
