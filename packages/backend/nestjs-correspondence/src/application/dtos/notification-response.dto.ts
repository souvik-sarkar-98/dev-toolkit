import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationPriority, NotificationType } from '../../domain/enums/notification-type.enum';
import type { NotificationAction } from '../../domain/aggregates/notification.aggregate';

export class NotificationActionDto {
  @ApiPropertyOptional({ example: '/secured/finance/donations' })
  url?: string;

  @ApiPropertyOptional({ example: 'NAVIGATE' })
  type?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { donationId: 'don_10482' },
  })
  data?: Record<string, any>;
}

export class NotificationResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  id: string;

  @ApiProperty({ example: 'Daily donation digest' })
  title: string;

  @ApiProperty({ example: '12 donations were recorded yesterday totaling ₹48,500.' })
  body: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.INFO })
  type: NotificationType;

  @ApiProperty({ example: 'FINANCE' })
  category: string;

  @ApiProperty({ enum: NotificationPriority, example: NotificationPriority.NORMAL })
  priority: NotificationPriority;

  @ApiPropertyOptional({ type: NotificationActionDto })
  action?: NotificationAction;

  @ApiPropertyOptional({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  referenceId?: string;

  @ApiPropertyOptional({ example: 'PROJECT' })
  referenceType?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.org/notices/digest.png' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'campaign' })
  icon?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { timezone: 'Asia/Kolkata' },
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: '2026-03-15T03:00:00.000Z' })
  expiresAt?: Date;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  updatedAt: Date;

  /**
   * Aggregate delivery outcome for admin audit views, derived from the
   * notification's recipient push results: "failed" when a push was attempted
   * but not delivered, otherwise "succeeded" when at least one was delivered.
   */
  @ApiPropertyOptional({ enum: ['failed', 'succeeded'], example: 'failed' })
  status?: 'failed' | 'succeeded';
}
