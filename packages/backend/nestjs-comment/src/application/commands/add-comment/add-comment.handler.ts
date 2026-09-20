import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { CommentModuleOptions } from '../../../comment.schema';
import { COMMENT_OPTIONS } from '../../../infrastructure/comment-options.token';
import { Comment } from '../../../domain/aggregates/comment.aggregate';
import {
  CommentNotFoundError,
  CommentParentMismatchError,
} from '../../../domain/errors/comment.errors';
import { ICommentEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { ICommentRepository } from '../../../domain/repositories/comment.repository';
import { CommentResponseDto } from '../../dtos/comment.dtos';
import { CommentResponseMapper } from '../../mappers/comment-response.mapper';
import { assertCommentEntityAccess } from '../../utilities/comment-entity-access.util';
import { AddCommentCommand } from './add-comment.command';

@CommandHandler(AddCommentCommand)
@Injectable()
export class AddCommentHandler implements ICommandHandler<AddCommentCommand, CommentResponseDto> {
  constructor(
    @Inject(ICommentRepository)
    private readonly repo: ICommentRepository,
    @Inject(COMMENT_OPTIONS)
    private readonly options: CommentModuleOptions,
    @Optional()
    @Inject(ICommentEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
    private readonly eventBus: EventBus,
  ) { }

  async execute({ params: cmd }: AddCommentCommand): Promise<CommentResponseDto> {
    await assertCommentEntityAccess(this.options, this.accessPort, {
      entityType: cmd.entityType,
      entityId: cmd.entityId,
      userId: cmd.authorId,
      userPermissions: cmd.userPermissions,
      action: 'write',
    });

    // 3. Parent comment validation (1 query — only when parentId supplied)
    if (cmd.parentId) {
      const parent = await this.repo.findById(cmd.parentId);
      if (!parent) throw new CommentNotFoundError(cmd.parentId);
      if (parent.entityType !== cmd.entityType || parent.entityId !== cmd.entityId) {
        throw new CommentParentMismatchError();
      }
    }

    // 4. Create aggregate — 1 query (comment row + mentions in one INSERT)
    const comment = Comment.create({
      content: cmd.content,
      authorId: cmd.authorId,
      authorName: cmd.authorName,
      entityType: cmd.entityType,
      entityId: cmd.entityId,
      mentions: cmd.mentions,
      parentId: cmd.parentId,
    });
    await this.repo.create(comment);

    // 5. Publish domain events — OnCommentAddedHandler will react and emit
    //    CommentMentionEvent if the comment has mentions.
    const events = [...comment.domainEvents];
    comment.clearEvents();
    this.eventBus.publishAll(events);

    return CommentResponseMapper.toDto(comment);
  }
}
