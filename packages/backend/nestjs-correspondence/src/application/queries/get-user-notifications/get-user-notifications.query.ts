import { BaseFilter } from '@ssdev-toolkit/nestjs-core';
import { UserNotificationFilter } from '../../../domain/aggregates/user-notification.aggregate';

export class GetUserNotificationsQuery {
  constructor(public readonly filter: BaseFilter<UserNotificationFilter>) {}
}
