import { ApiProperty } from '@nestjs/swagger';

export class RoleGroupResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) id: string;
  @ApiProperty({ example: 'field_team' }) key: string;
  @ApiProperty({ required: false, example: 'Field Team' }) description?: string;
  @ApiProperty({
    description: 'Shadow groups are platform/break-glass and hidden from member pickers by default.',
    example: false,
    default: false,
  })
  isShadow!: boolean;
  @ApiProperty({ type: [String], example: ['volunteer_coordinator'] }) roleKeys: string[];
  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' }) createdAt: Date;
}
