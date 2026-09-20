import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetNotificationsAdminQuery } from './get-notifications-admin.query';
import { INotificationRepository } from '../../../domain/repositories/notification.repository';
import { NotificationMapper } from '../../mappers/notification.mapper';
import { NotificationResponseDto } from '../../dtos/notification-response.dto';
import { PagedResponse } from '@ssdev-toolkit/nestjs-core';

@QueryHandler(GetNotificationsAdminQuery)
export class GetNotificationsAdminHandler
  implements IQueryHandler<GetNotificationsAdminQuery, PagedResponse<NotificationResponseDto>> {
  constructor(
    @Inject(INotificationRepository)
    private readonly notificationRepo: INotificationRepository,
  ) { }

  async execute(query: GetNotificationsAdminQuery): Promise<PagedResponse<NotificationResponseDto>> {
    const page = await this.notificationRepo.findPaged(query.filter);
    const statuses = await this.notificationRepo.getDeliveryStatuses(
      page.content.map((n) => n.id),
    );
    const dtos = page.content.map((n) => NotificationMapper.toDto(n, statuses.get(n.id)));
    return new PagedResponse(dtos, page.totalSize, page.pageIndex, page.pageSize);
  }
}
