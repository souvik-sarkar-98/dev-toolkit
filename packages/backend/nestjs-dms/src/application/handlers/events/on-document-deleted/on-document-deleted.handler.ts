import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { DocumentDeletedEvent } from '../../../../domain/events/document-deleted.event';

@EventsHandler(DocumentDeletedEvent)
@Injectable()
export class OnDocumentDeletedHandler implements IEventHandler<DocumentDeletedEvent> {
  private readonly logger = new Logger(OnDocumentDeletedHandler.name);

  async handle(event: DocumentDeletedEvent): Promise<void> {
    this.logger.log(`Document deleted: ${event.snapshot.id} (${event.snapshot.fileName})`);
    // Extension point: dispatch downstream commands (notify owner, audit, cleanup)
  }
}
