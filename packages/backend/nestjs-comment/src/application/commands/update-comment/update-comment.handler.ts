import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { CommentModuleOptions } from '../../../comment.schema';
import { COMMENT_OPTIONS } from '../../../infrastructure/comment-options.token';
import {
  CommentNotFoundError,
  CommentOwnershipError,
} from '../../../domain/errors/comment.errors';
import { ICommentEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { ICommentRepository } from '../../../domain/repositories/comment.repository';
import { CommentResponseDto } from '../../dtos/comment.dtos';
import { CommentResponseMapper } from '../../mappers/comment-response.mapper';
import { assertCommentEntityAccess } from '../../utilities/comment-entity-access.util';
import { UpdateCommentCommand } from './update-comment.command';

@CommandHandler(UpdateCommentCommand)
@Injectable()
export class UpdateCommentHandler
  implements ICommandHandler<UpdateCommentCommand, CommentResponseDto> {
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

  async execute({ params: cmd }: UpdateCommentCommand): Promise<CommentResponseDto> {
    const comment = await this.repo.findById(cmd.id);
    if (!comment) throw new CommentNotFoundError(cmd.id);
    if (comment.authorId !== cmd.authorId) throw new CommentOwnershipError();

    await assertCommentEntityAccess(this.options, this.accessPort, {
      entityType: comment.entityType,
      entityId: comment.entityId,
      userId: cmd.authorId,
      userPermissions: cmd.userPermissions,
      action: 'write',
    });

    // 3. Domain update — aggregate records new mentions in CommentUpdatedEvent
    const { updated } = comment.update(cmd.content, cmd.mentions);

    if (updated) {
      // 1 query: UPDATE + atomic mention replace (deleteMany + createMany nested)
      await this.repo.update(comment.id, comment);
    }

    // 4. Publish aggregate domain events — OnCommentUpdatedHandler will react
    //    and emit CommentMentionEvent for any newly added mentions.
    const events = [...comment.domainEvents];
    comment.clearEvents();
    this.eventBus.publishAll(events);

    return CommentResponseMapper.toDto(comment);
  }
}
