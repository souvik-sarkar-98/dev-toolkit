import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthUser, CurrentUser, RequirePermissions, UnifiedAuthGuard, requireUserId } from '@ssdev-toolkit/nestjs-auth';
import {
  ApiAutoResponse,
  ApiAutoVoidResponse,
  ApiUuidParam,
} from '@ssdev-toolkit/nestjs-core';
import { AddCommentCommand } from '../../application/commands/add-comment/add-comment.command';
import { UpdateCommentCommand } from '../../application/commands/update-comment/update-comment.command';
import { DeleteCommentCommand } from '../../application/commands/delete-comment/delete-comment.command';
import { GetCommentsQuery } from '../../application/queries/get-comments/get-comments.query';
import {
  CommentResponseDto,
  CreateCommentDto,
  GetCommentsQueryDto,
  GetCommentsResponseDto,
  UpdateCommentDto,
} from '../../application/dtos/comment.dtos';

@ApiTags('Comments')
@ApiBearerAuth('jwt')
@UseGuards(UnifiedAuthGuard)
@Controller('comments')
export class CommentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new comment or reply' })
  @ApiAutoResponse(CommentResponseDto, { status: 201 })
  @RequirePermissions('create:comments')
  addComment(
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommentResponseDto> {
    const authorId = requireUserId(user);

    return this.commandBus.execute(
      new AddCommentCommand({
        content: dto.content,
        entityType: dto.entityType,
        entityId: dto.entityId,
        parentId: dto.parentId,
        mentions: dto.mentions,
        authorId,
        authorName: user.name ?? 'Unknown User',
        authorEmail: user.email ?? '',
        userPermissions: user.permissions ?? [],
      }),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing comment' })
  @ApiUuidParam('id', 'Identifier of the comment')
  @ApiAutoResponse(CommentResponseDto)
  @RequirePermissions('update:comments')
  updateComment(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommentResponseDto> {
    const authorId = requireUserId(user);

    return this.commandBus.execute(
      new UpdateCommentCommand({
        id,
        content: dto.content,
        mentions: dto.mentions,
        authorId,
        authorName: user.name ?? 'Unknown User',
        userPermissions: user.permissions ?? [],
      }),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment and all its replies' })
  @ApiUuidParam('id', 'Identifier of the comment')
  @ApiAutoVoidResponse({ status: 204 })
  @RequirePermissions('delete:comments')
  deleteComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const authorId = requireUserId(user);

    return this.commandBus.execute(
      new DeleteCommentCommand({
        id,
        authorId,
        userPermissions: user.permissions ?? [],
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get comments for an entity' })
  @ApiAutoResponse(GetCommentsResponseDto)
  @RequirePermissions('read:comments')
  getComments(
    @Query() query: GetCommentsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetCommentsResponseDto> {
    const userId = requireUserId(user);

    return this.queryBus.execute(
      new GetCommentsQuery({
        entityType: query.entityType,
        entityId: query.entityId,
        userId,
        userPermissions: user.permissions ?? [],
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }
}
