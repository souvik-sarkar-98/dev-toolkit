import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { NotificationCreatedEvent, type NotificationCreatedSnapshot } from '../events/notification-created.event';
import { NotificationPriority, NotificationType } from '../enums/notification-type.enum';

export { NotificationType, NotificationPriority };

export interface NotificationAction {
  url?: string;
  type?: string;
  data?: Record<string, any>;
}

export interface NotificationFilter {
  type?: NotificationType;
  category?: string;
  priority?: NotificationPriority;
  referenceId?: string;
  referenceType?: string;
  dispatchId?: string;
  fromDate?: Date;
  toDate?: Date;
  /** Admin audit: aggregate delivery outcome derived from recipient push results. */
  status?: 'failed' | 'succeeded';
}

export class Notification extends AggregateRoot<string> {
  #title: string;
  #body: string;
  #type: NotificationType;
  #category: string;
  #priority: NotificationPriority;
  #action?: NotificationAction;
  #referenceId?: string;
  #referenceType?: string;
  #dispatchId?: string;
  #imageUrl?: string;
  #icon?: string;
  #metadata?: Record<string, any>;
  #expiresAt?: Date;

  constructor(
    id: string,
    title: string,
    body: string,
    type: NotificationType,
    category: string,
    options?: {
      priority?: NotificationPriority;
      action?: NotificationAction;
      referenceId?: string;
      referenceType?: string;
      dispatchId?: string;
      imageUrl?: string;
      icon?: string;
      metadata?: Record<string, any>;
      expiresAt?: Date;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    super(id, options?.createdAt, options?.updatedAt);
    this.#title = title;
    this.#body = body;
    this.#type = type;
    this.#category = category;
    this.#priority = options?.priority ?? NotificationPriority.NORMAL;
    this.#action = options?.action;
    this.#referenceId = options?.referenceId;
    this.#referenceType = options?.referenceType;
    this.#dispatchId = options?.dispatchId;
    this.#imageUrl = options?.imageUrl;
    this.#icon = options?.icon;
    this.#metadata = options?.metadata;
    this.#expiresAt = options?.expiresAt;
  }

  static create(op: {
    title: string;
    body: string;
    type: NotificationType;
    category: string;
    priority?: NotificationPriority;
    action?: NotificationAction;
    referenceId?: string;
    referenceType?: string;
    dispatchId?: string;
    imageUrl?: string;
    icon?: string;
    metadata?: Record<string, any>;
    expiresAt?: Date;
  }): Notification {
    const notification = new Notification(
      randomUUID(),
      op.title,
      op.body,
      op.type,
      op.category,
      {
        priority: op.priority,
        action: op.action,
        referenceId: op.referenceId,
        referenceType: op.referenceType,
        dispatchId: op.dispatchId,
        imageUrl: op.imageUrl,
        icon: op.icon,
        metadata: op.metadata,
        expiresAt: op.expiresAt,
      },
    );
    notification.addDomainEvent(new NotificationCreatedEvent(notification.toSnapshot<NotificationCreatedSnapshot>()));
    return notification;
  }

  isExpired(): boolean {
    return this.#expiresAt ? new Date() > this.#expiresAt : false;
  }

  get title(): string { return this.#title; }
  get body(): string { return this.#body; }
  get type(): NotificationType { return this.#type; }
  get category(): string { return this.#category; }
  get priority(): NotificationPriority { return this.#priority; }
  get action(): NotificationAction | undefined { return this.#action; }
  get referenceId(): string | undefined { return this.#referenceId; }
  get referenceType(): string | undefined { return this.#referenceType; }
  get dispatchId(): string | undefined { return this.#dispatchId; }
  get imageUrl(): string | undefined { return this.#imageUrl; }
  get icon(): string | undefined { return this.#icon; }
  get metadata(): Record<string, any> | undefined { return this.#metadata; }
  get expiresAt(): Date | undefined { return this.#expiresAt; }
}
