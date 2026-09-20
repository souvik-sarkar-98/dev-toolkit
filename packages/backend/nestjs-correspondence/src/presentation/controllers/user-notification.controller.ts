import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiAutoPagedResponse,
  ApiAutoPrimitiveResponse,
  ApiAutoVoidResponse,
  ApiUuidParam,
  BaseFilter,
  ENVELOPE_EXAMPLES,
  PagedResponse,
} from '@ssdev-toolkit/nestjs-core';
import {
  UnifiedAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  CurrentUser,
  AuthUser,
  requireUserId,
} from '@ssdev-toolkit/nestjs-auth';
import { GetUserNotificationsQuery } from '../../application/queries/get-user-notifications/get-user-notifications.query';
import { GetUnreadCountQuery } from '../../application/queries/get-unread-count/get-unread-count.query';
import { MarkUserNotificationReadCommand } from '../../application/commands/mark-user-notification-read/mark-user-notification-read.command';
import { MarkAllUserNotificationsReadCommand } from '../../application/commands/mark-all-user-notifications-read/mark-all-user-notifications-read.command';
import { ArchiveUserNotificationCommand } from '../../application/commands/archive-user-notification/archive-user-notification.command';
import { ResendPushCommand } from '../../application/commands/resend-push/resend-push.command';
import { GetUserNotificationsRequestDto } from '../../application/dtos/notification.request.dto';
import { UserNotificationResponseDto } from '../../application/dtos/user-notification-response.dto';
import { UserNotificationFilter } from '../../domain/aggregates/user-notification.aggregate';

/**
 * Notification endpoints scoped to the currently authenticated user.
 * Uses user.userId (app profile UUID) — not user.idpSub.
 */
@ApiTags('correspondence / notifications')
@Controller('correspondence/notifications/me')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
export class UserNotificationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Get()
  @RequirePermissions('read:notifications')
  @ApiOperation({ summary: 'List current user notifications (paged)' })
  @ApiAutoPagedResponse(UserNotificationResponseDto)
  async list(
    @Query() query: GetUserNotificationsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PagedResponse<UserNotificationResponseDto>> {
    return this.queryBus.execute(
      new GetUserNotificationsQuery(
        new BaseFilter<UserNotificationFilter>(
          { userId: requireUserId(user), isRead: query.isRead, isArchived: query.isArchived },
          query.pageIndex,
          query.pageSize,
          query.sortBy,
          query.sortDir,
        ),
      ),
    );
  }

  @Get('unread-count')
  @RequirePermissions('read:notifications')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiAutoPrimitiveResponse('number', {
    description: 'Number of unread notifications',
  })
  @ApiOkResponse({ example: { ...ENVELOPE_EXAMPLES, responsePayload: 7 } })
  async unreadCount(@CurrentUser() user: AuthUser): Promise<number> {
    return this.queryBus.execute(new GetUnreadCountQuery(requireUserId(user)));
  }

  @Patch('read-all')
  @RequirePermissions('update:notifications')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiAutoVoidResponse()
  async markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.commandBus.execute(new MarkAllUserNotificationsReadCommand(requireUserId(user)));
  }

  @Patch(':id/read')
  @RequirePermissions('update:notifications')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiUuidParam('id', 'Identifier of the user notification')
  @ApiAutoVoidResponse()
  async markRead(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.commandBus.execute(new MarkUserNotificationReadCommand(id, requireUserId(user)));
  }

  @Patch(':id/archive')
  @RequirePermissions('update:notifications')
  @ApiOperation({ summary: 'Archive a single notification' })
  @ApiUuidParam('id', 'Identifier of the user notification')
  @ApiAutoVoidResponse()
  async archive(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.commandBus.execute(new ArchiveUserNotificationCommand(id, requireUserId(user)));
  }

  @Patch(':id/resend-push')
  @RequirePermissions('update:notifications')
  @ApiOperation({ summary: 'Retry push delivery for a notification' })
  @ApiUuidParam('id', 'Identifier of the user notification')
  @ApiAutoVoidResponse()
  async resendPush(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.commandBus.execute(new ResendPushCommand(id, requireUserId(user)));
  }
}
