import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAutoPagedResponse, BaseFilter, PagedResponse } from '@ssdev-toolkit/nestjs-core';
import { UnifiedAuthGuard, PermissionsGuard, RequirePermissions } from '@ssdev-toolkit/nestjs-auth';
import { GetNotificationsAdminQuery } from '../../application/queries/get-notifications-admin/get-notifications-admin.query';
import { GetAdminNotificationsRequestDto } from '../../application/dtos/notification.request.dto';
import { NotificationResponseDto } from '../../application/dtos/notification-response.dto';
import { NotificationFilter } from '../../domain/aggregates/notification.aggregate';

@ApiTags('correspondence / admin')
@Controller('correspondence/admin/notifications')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
export class NotificationAdminController {
  constructor(private readonly queryBus: QueryBus) { }

  @Get()
  @RequirePermissions('read:notifications')
  @ApiOperation({ summary: 'List all notifications (admin)' })
  @ApiAutoPagedResponse(NotificationResponseDto)
  async list(
    @Query() query: GetAdminNotificationsRequestDto,
  ): Promise<PagedResponse<NotificationResponseDto>> {
    return this.queryBus.execute(
      new GetNotificationsAdminQuery(
        new BaseFilter<NotificationFilter>(
          {
            referenceId: query.referenceId,
            referenceType: query.referenceType,
            status: query.status,
          },
          query.pageIndex,
          query.pageSize,
          query.sortBy,
          query.sortDir,
        ),
      ),
    );
  }
}
