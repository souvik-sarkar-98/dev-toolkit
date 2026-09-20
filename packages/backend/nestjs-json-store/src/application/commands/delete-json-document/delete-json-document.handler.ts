import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { JsonDocumentNotFoundError } from '../../../domain/errors/json-store.errors';
import { IJsonDocumentRepository } from '../../../domain/repositories/json-document.repository';
import { DeleteJsonDocumentCommand } from './delete-json-document.command';

@CommandHandler(DeleteJsonDocumentCommand)
@Injectable()
export class DeleteJsonDocumentHandler
  implements ICommandHandler<DeleteJsonDocumentCommand, void>
{
  constructor(
    @Inject(IJsonDocumentRepository)
    private readonly repo: IJsonDocumentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ params }: DeleteJsonDocumentCommand): Promise<void> {
    const document = await this.repo.findById(params.id);
    if (!document) {
      throw new JsonDocumentNotFoundError(params.id);
    }

    document.markDeleted();
    await this.repo.delete(document.id);

    const events = [...document.domainEvents];
    document.clearEvents();
    this.eventBus.publishAll(events);
  }
}
