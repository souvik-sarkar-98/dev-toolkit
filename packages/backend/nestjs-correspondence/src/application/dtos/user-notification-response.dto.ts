import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

export class UserNotificationResponseDto {
  @ApiProperty({ example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  id: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  notificationId: string;

  @ApiProperty({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  userId: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiPropertyOptional({ example: '2026-03-14T10:00:00.000Z' })
  readAt?: Date;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiPropertyOptional({ example: '2026-03-14T11:00:00.000Z' })
  archivedAt?: Date;

  @ApiProperty({ example: true })
  isPushSent: boolean;

  @ApiProperty({ example: false })
  pushDelivered: boolean;

  @ApiPropertyOptional({ example: 'Device token expired' })
  pushError?: string;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: NotificationResponseDto })
  notification?: NotificationResponseDto;
}
