import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriberType } from '../../domain/enums/subscriber-type.enum';
import { SubscribedVia } from '../../domain/enums/subscribed-via.enum';
import { ChannelType } from '../../domain/enums/channel-type.enum';
import { EmailRole } from '../../domain/enums/email-role.enum';

export class SubscriptionChannelDto {
  @ApiProperty({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  id: string;

  @ApiProperty({ enum: ChannelType, example: ChannelType.EMAIL })
  channel: ChannelType;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiPropertyOptional({ enum: EmailRole, example: EmailRole.TO })
  emailRole?: EmailRole;
}

export class SubscriptionResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  id: string;

  @ApiProperty({ enum: SubscriberType, example: SubscriberType.USER })
  subscriberType: SubscriberType;

  @ApiPropertyOptional({ example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  userId?: string;

  @ApiPropertyOptional({ example: 'asha.verma@example.org' })
  userEmail?: string;

  @ApiPropertyOptional({ example: 'Asha Verma' })
  userName?: string;

  @ApiPropertyOptional({ description: 'Set when subscriberType is ROLE', example: 'FINANCE_ADMIN' })
  roleName?: string;

  @ApiProperty({ example: 'PROJECT' })
  resourceType: string;

  @ApiPropertyOptional({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  resourceId?: string;

  @ApiProperty({ enum: SubscribedVia, example: SubscribedVia.MANUAL })
  subscribedVia: SubscribedVia;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: [SubscriptionChannelDto] })
  channels: SubscriptionChannelDto[];

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  updatedAt: Date;
}
