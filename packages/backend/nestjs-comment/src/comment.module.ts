import { DynamicModule, Inject, Injectable, Module, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import {
  BaseModuleValidator,
  IEntityAccessPort,
  registerModuleValidator,
} from '@ssdev-toolkit/nestjs-core';

import { CommentModuleOptions } from './comment.schema';
import { COMMENT_OPTIONS } from './infrastructure/comment-options.token';
import { ICommentEntityAccessPort } from './domain/ports/entity-access.port';
import { ICommentRepository } from './domain/repositories/comment.repository';

import { AddCommentHandler } from './application/commands/add-comment/add-comment.handler';
import { UpdateCommentHandler } from './application/commands/update-comment/update-comment.handler';
import { DeleteCommentHandler } from './application/commands/delete-comment/delete-comment.handler';

import { GetCommentsHandler } from './application/queries/get-comments/get-comments.handler';

import { OnCommentAddedHandler } from './application/handlers/events/on-comment-added/on-comment-added.handler';
import { OnCommentUpdatedHandler } from './application/handlers/events/on-comment-updated/on-comment-updated.handler';
import { OnCommentMentionedHandler } from './application/handlers/events/on-comment-mentioned/on-comment-mentioned.handler';
import { OnCommentAddedSubscriberHandler } from './application/handlers/events/on-comment-added-subscriber/on-comment-added-subscriber.handler';

import { CommentController } from './presentation/controllers/comment.controller';

const COMMENT_MODULE_VALIDATOR = Symbol('CommentModule.internalValidator');

const ENTITY_ACCESS_PORT_MISSING_MSG =
  '[CommentModule] ICommentEntityAccessPort is not provided. ' +
  'Comment read/write access will NOT be restricted by record-level entity checks — ' +
  'any authenticated user with the required permission can access comments on any entityType/entityId. ' +
  'Fix: implement IEntityAccessPort in your app, register ' +
  '{ provide: ICommentEntityAccessPort, useClass: MyAdapter }, ' +
  'export the token from a module, and add that module to the imports array of CommentModule.forRoot().';

@Injectable()
class CommentModuleValidator extends BaseModuleValidator {
  constructor(
    moduleRef: ModuleRef,
    @Optional()
    @Inject(ICommentEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) {
    super(moduleRef);
  }

  protected getModuleName(): string {
    return 'CommentModule';
  }

  protected validateModule(): void {
    this.requirePort(
      ICommentRepository,
      'Register ICommentRepository in PersistenceModule and import PersistenceModule before CommentModule.',
    );

    if (!this.accessPort) {
      this.warn(ENTITY_ACCESS_PORT_MISSING_MSG);
    }
  }
}

const COMMAND_HANDLERS = [AddCommentHandler, UpdateCommentHandler, DeleteCommentHandler];

const QUERY_HANDLERS = [GetCommentsHandler];

const EVENT_HANDLERS = [
  OnCommentAddedHandler,
  OnCommentUpdatedHandler,
  OnCommentMentionedHandler,
  OnCommentAddedSubscriberHandler,
];

export interface CommentModuleOverrides {
  /**
   * Extra modules to import — used by the host to register adapters the comment
   * module consumes, e.g. a module exporting `ICommentEntityAccessPort` or
   * `COMMENT_NOTIFICATION_PORT`.
   */
  imports?: DynamicModule['imports'];
}

@Module({})
export class CommentModule {
  static forRoot(
    options: CommentModuleOptions,
    overrides?: CommentModuleOverrides,
  ): DynamicModule {
    return {
      module: CommentModule,
      imports: [CqrsModule, ...(overrides?.imports ?? [])],
      controllers: [CommentController],
      providers: [
        { provide: COMMENT_OPTIONS, useValue: options },
        registerModuleValidator(COMMENT_MODULE_VALIDATOR, CommentModuleValidator),
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
        ...EVENT_HANDLERS,
      ],
      exports: [COMMENT_OPTIONS],
    };
  }
}
