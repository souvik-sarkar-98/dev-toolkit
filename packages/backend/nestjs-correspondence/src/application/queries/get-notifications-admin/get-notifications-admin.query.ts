import { BaseFilter } from '@ssdev-toolkit/nestjs-core';
import { NotificationFilter } from '../../../domain/aggregates/notification.aggregate';

export class GetNotificationsAdminQuery {
  constructor(public readonly filter: BaseFilter<NotificationFilter>) {}
}
