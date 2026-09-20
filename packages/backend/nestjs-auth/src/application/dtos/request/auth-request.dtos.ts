import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginatedQueryDto } from '@ssdev-toolkit/nestjs-core';

export class GenerateApiKeyRequestDto {
  @ApiProperty({ example: 'My Service Key' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: ['read:data', 'write:data'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({ required: false, example: '2026-03-14T09:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class UpdateApiKeyPermissionsRequestDto {
  @ApiProperty({ example: ['read:data'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class GrantRoleRequestDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(1)
  roleKey: string;

  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false, example: 'proj-A' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ required: false, example: 'project' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ required: false, example: 'Granted for the 2026 monsoon relief drive' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class GrantPermissionRequestDto {
  @ApiProperty({ example: 'read:projects' })
  @IsString()
  @MinLength(1)
  permissionKey: string;

  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false, example: 'proj-A' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ required: false, example: 'project' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ required: false, example: 'One-off access for audit support' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AddToGroupRequestDto {
  @ApiProperty({ example: 'platform-admins' })
  @IsString()
  @MinLength(1)
  groupKey: string;

  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ required: false, example: 'proj-A' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ required: false, example: 'project' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ required: false, example: 'Added for the 2026 monsoon relief drive' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateCatalogItemRequestDto {
  @ApiProperty({ example: 'volunteer_coordinator', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  key: string;

  @ApiProperty({ required: false, example: 'Coordinates volunteer assignments' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCatalogItemRequestDto {
  @ApiProperty({ required: false, example: 'Coordinates volunteer assignments' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SyncRolePermissionsRequestDto {
  @ApiProperty({ example: ['read:users', 'update:users'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionKeys: string[];
}

export class SyncRoleGroupRolesRequestDto {
  @ApiProperty({ example: ['MEMBER', 'SECRETARY'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleKeys: string[];
}

/** List roles/groups with optional inclusion of shadow (platform) catalog items. */
export class ListAuthCatalogQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({
    default: false,
    description: 'When true, include shadow roles/groups. Default excludes them.',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean()
  includeShadow?: boolean = false;
}
