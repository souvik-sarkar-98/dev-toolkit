import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUnreadCountQuery } from './get-unread-count.query';
import { IUserNotificationRepository } from '../../../domain/repositories/user-notification.repository';

@QueryHandler(GetUnreadCountQuery)
export class GetUnreadCountHandler implements IQueryHandler<GetUnreadCountQuery, number> {
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepo: IUserNotificationRepository,
  ) {}

  async execute(query: GetUnreadCountQuery): Promise<number> {
    return this.userNotificationRepo.countUnread(query.userId);
  }
}
