import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { JsonDocumentNotFoundError } from '../../../domain/errors/json-store.errors';
import { IJsonDocumentPayloadValidatorPort } from '../../../domain/ports/json-document-payload-validator.port';
import { IJsonDocumentRepository } from '../../../domain/repositories/json-document.repository';
import { JsonDocumentResponseDto } from '../../dtos/json-document.dtos';
import { JsonDocumentResponseMapper } from '../../mappers/json-document-response.mapper';
import { UpdateJsonDocumentCommand } from './update-json-document.command';

@CommandHandler(UpdateJsonDocumentCommand)
@Injectable()
export class UpdateJsonDocumentHandler
  implements ICommandHandler<UpdateJsonDocumentCommand, JsonDocumentResponseDto>
{
  constructor(
    @Inject(IJsonDocumentRepository)
    private readonly repo: IJsonDocumentRepository,
    @Inject(IJsonDocumentPayloadValidatorPort)
    private readonly payloadValidator: IJsonDocumentPayloadValidatorPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ params }: UpdateJsonDocumentCommand): Promise<JsonDocumentResponseDto> {
    const document = await this.repo.findById(params.id);
    if (!document) {
      throw new JsonDocumentNotFoundError(params.id);
    }

    this.payloadValidator.validate(document.namespace, document.key, params.payload);

    document.update(params.payload);
    await this.repo.update(document.id, document);

    const events = [...document.domainEvents];
    document.clearEvents();
    this.eventBus.publishAll(events);

    return JsonDocumentResponseMapper.toDto(document);
  }
}
