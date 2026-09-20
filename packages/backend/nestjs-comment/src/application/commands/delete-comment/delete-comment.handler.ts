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
import { assertCommentEntityAccess } from '../../utilities/comment-entity-access.util';
import { DeleteCommentCommand } from './delete-comment.command';

@CommandHandler(DeleteCommentCommand)
@Injectable()
export class DeleteCommentHandler implements ICommandHandler<DeleteCommentCommand, void> {
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

  async execute({ params: cmd }: DeleteCommentCommand): Promise<void> {
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

    // 3. Raise domain event before deletion (aggregate carries the ids)
    comment.softDelete();
    const events = [...comment.domainEvents];
    comment.clearEvents();

    // 4. Recursive soft-delete in repository
    await this.repo.delete(cmd.id);

    // 5. Publish events after successful persistence
    this.eventBus.publishAll(events);
  }
}
