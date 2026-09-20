import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const MAX_COMMENT_LENGTH = 10000;

export class MentionDto {
  @ApiProperty({ description: 'ID of the mentioned user', example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Display name of the mentioned user', example: 'Asha Verma' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ description: 'Email of the mentioned user', example: 'asha.verma@example.org' })
  @IsEmail()
  email: string;
}

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content — may contain @[userId] tokens for client rendering',
    example: 'Please attach the vendor invoice before settlement.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_COMMENT_LENGTH)
  content: string;

  @ApiProperty({ description: 'The type of entity being commented on', example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({
    description: 'The ID of the entity being commented on',
    example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({
    description: 'Parent comment ID when posting a reply',
    example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68',
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({
    description: 'Explicit list of users mentioned in the comment',
    type: [MentionDto],
    default: [],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MentionDto)
  mentions: MentionDto[];
}

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'Please attach the vendor invoice before settlement.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_COMMENT_LENGTH)
  content: string;

  @ApiProperty({
    description:
      'Full updated list of mentions — server diffs against existing ones to detect new @mentions',
    type: [MentionDto],
    default: [],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MentionDto)
  mentions: MentionDto[];
}

export class GetCommentsQueryDto {
  @ApiProperty({ description: 'The type of entity to fetch comments for', example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({
    description: 'The ID of the entity to fetch comments for',
    example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ description: 'Maximum number of root comments to return', default: 50, type: Number, example: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of root comments to skip (pagination)', default: 0, type: Number, example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}

export class CommentMentionResponseDto {
  @ApiProperty({ example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  userId: string;

  @ApiProperty({ example: 'Asha Verma' })
  displayName: string;
}

export class CommentResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  id: string;

  @ApiProperty({ example: 'Please attach the vendor invoice before settlement.' })
  content: string;

  @ApiProperty({ example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' })
  authorId: string;

  @ApiPropertyOptional({ example: 'Asha Verma' })
  authorName?: string;

  @ApiProperty({ example: 'PROJECT' })
  entityType: string;

  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' })
  entityId: string;

  @ApiPropertyOptional({ example: '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68' })
  parentId?: string;

  @ApiProperty({ type: () => [CommentResponseDto] })
  replies: CommentResponseDto[];

  @ApiProperty({ type: () => [CommentMentionResponseDto] })
  mentions: CommentMentionResponseDto[];

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' })
  updatedAt: Date;
}

export class GetCommentsResponseDto {
  @ApiProperty({ description: 'Whether the caller is permitted to view comments for this entity', example: true })
  hasAccess: boolean;

  @ApiPropertyOptional({ description: 'Machine-readable denial code when hasAccess is false', example: 'COMMENT_ACCESS_DENIED' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Human-readable denial message when hasAccess is false',
    example: 'No read access on PROJECT/3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55',
  })
  message?: string;

  @ApiProperty({ type: () => [CommentResponseDto] })
  comments: CommentResponseDto[];

  @ApiProperty({ description: 'Total number of root comments (before pagination)', example: 2 })
  total: number;
}
