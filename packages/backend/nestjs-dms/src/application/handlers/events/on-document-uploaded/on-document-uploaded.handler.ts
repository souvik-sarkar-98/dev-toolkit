import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { DocumentUploadedEvent } from '../../../../domain/events/document-uploaded.event';

@EventsHandler(DocumentUploadedEvent)
@Injectable()
export class OnDocumentUploadedHandler implements IEventHandler<DocumentUploadedEvent> {
  private readonly logger = new Logger(OnDocumentUploadedHandler.name);

  async handle(event: DocumentUploadedEvent): Promise<void> {
    this.logger.log(`Document uploaded: ${event.snapshot.id} (${event.snapshot.fileName})`);
    // Extension point: dispatch downstream commands (audit, notification, billing)
  }
}
