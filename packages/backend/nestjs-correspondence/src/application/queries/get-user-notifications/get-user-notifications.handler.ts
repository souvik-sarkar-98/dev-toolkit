import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserNotificationsQuery } from './get-user-notifications.query';
import { IUserNotificationRepository } from '../../../domain/repositories/user-notification.repository';
import { INotificationRepository } from '../../../domain/repositories/notification.repository';
import { NotificationMapper } from '../../mappers/notification.mapper';
import { UserNotificationResponseDto } from '../../dtos/user-notification-response.dto';
import { PagedResponse } from '@ssdev-toolkit/nestjs-core';

@QueryHandler(GetUserNotificationsQuery)
export class GetUserNotificationsHandler
  implements IQueryHandler<GetUserNotificationsQuery, PagedResponse<UserNotificationResponseDto>> {
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepo: IUserNotificationRepository,
    @Inject(INotificationRepository)
    private readonly notificationRepo: INotificationRepository,
  ) { }

  async execute(query: GetUserNotificationsQuery): Promise<PagedResponse<UserNotificationResponseDto>> {
    const page = await this.userNotificationRepo.findPaged(query.filter);

    const dtos = await Promise.all(
      page.content.map(async (un) => {
        const notification = await this.notificationRepo.findById(un.notificationId);
        return NotificationMapper.toUserNotificationDto(un, notification ?? undefined);
      }),
    );

    return new PagedResponse(dtos, page.totalSize, page.pageIndex, page.pageSize);
  }
}
