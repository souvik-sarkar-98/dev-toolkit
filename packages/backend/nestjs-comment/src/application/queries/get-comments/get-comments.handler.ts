import { Inject, Injectable, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  EntityTypeForbiddenError,
  EntityAccessDeniedError,
  IEntityAccessPort,
  resolvePublicErrorMessage,
} from '@ssdev-toolkit/nestjs-core';
import { CommentModuleOptions } from '../../../comment.schema';
import { COMMENT_OPTIONS } from '../../../infrastructure/comment-options.token';
import { ICommentEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { ICommentRepository } from '../../../domain/repositories/comment.repository';
import { GetCommentsResponseDto } from '../../dtos/comment.dtos';
import { CommentResponseMapper } from '../../mappers/comment-response.mapper';
import { assertCommentEntityAccess } from '../../utilities/comment-entity-access.util';
import { GetCommentsQuery } from './get-comments.query';

@QueryHandler(GetCommentsQuery)
@Injectable()
export class GetCommentsHandler
  implements IQueryHandler<GetCommentsQuery, GetCommentsResponseDto> {
  constructor(
    @Inject(ICommentRepository)
    private readonly repo: ICommentRepository,
    @Inject(COMMENT_OPTIONS)
    private readonly options: CommentModuleOptions,
    @Optional()
    @Inject(ICommentEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) { }

  async execute({ params: q }: GetCommentsQuery): Promise<GetCommentsResponseDto> {
    try {
      await assertCommentEntityAccess(this.options, this.accessPort, {
        entityType: q.entityType,
        entityId: q.entityId,
        userId: q.userId,
        userPermissions: q.userPermissions,
        action: 'read',
      });
    } catch (err) {
      if (err instanceof EntityTypeForbiddenError || err instanceof EntityAccessDeniedError) {
        return {
          hasAccess: false,
          reason: err.errorCode,
          message: resolvePublicErrorMessage(err),
          comments: [],
          total: 0,
        };
      }
      throw err;
    }

    const { comments, total } = await this.repo.findByEntity(
      q.entityType,
      q.entityId,
      q.limit,
      q.offset,
    );
    return {
      hasAccess: true,
      comments: comments.map((c) => CommentResponseMapper.toDto(c)),
      total,
    };
  }
}
