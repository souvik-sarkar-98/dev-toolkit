import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChannelType } from '../../domain/enums/channel-type.enum';
import { EmailRole } from '../../domain/enums/email-role.enum';
import { SubscribedVia } from '../../domain/enums/subscribed-via.enum';

export class ChannelConfigDto {
  @ApiProperty({ enum: ChannelType, example: ChannelType.EMAIL })
  @IsEnum(ChannelType)
  channel: ChannelType;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ enum: EmailRole, example: EmailRole.TO })
  @IsOptional()
  @IsEnum(EmailRole)
  emailRole?: EmailRole;
}

export class SubscribeUserRequestDto {
  @ApiProperty({ example: 'project' })
  @IsString()
  resourceType: string;

  @ApiPropertyOptional({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ enum: SubscribedVia, example: SubscribedVia.MANUAL })
  @IsOptional()
  @IsEnum(SubscribedVia)
  via?: SubscribedVia;

  @ApiPropertyOptional({ type: [ChannelConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelConfigDto)
  channels?: ChannelConfigDto[];
}

export class UpdateChannelConfigRequestDto {
  @ApiProperty({ enum: ChannelType, example: ChannelType.EMAIL })
  @IsEnum(ChannelType)
  channel: ChannelType;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ enum: EmailRole, example: EmailRole.TO })
  @IsOptional()
  @IsEnum(EmailRole)
  emailRole?: EmailRole;
}
