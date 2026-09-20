import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginatedQueryDto } from '@ssdev-toolkit/nestjs-core';

export class GetUserNotificationsRequestDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isArchived?: boolean;
}

export type NotificationDeliveryStatus = 'failed' | 'succeeded';

export class GetAdminNotificationsRequestDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'PROJECT' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({
    enum: ['failed', 'succeeded'],
    example: 'failed',
    description: 'Filter by aggregate delivery outcome (admin audit)',
  })
  @IsOptional()
  @IsEnum(['failed', 'succeeded'] as const)
  status?: NotificationDeliveryStatus;
}
