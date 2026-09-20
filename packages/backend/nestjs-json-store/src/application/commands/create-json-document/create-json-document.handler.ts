import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { JsonDocument } from '../../../domain/aggregates/json-document.aggregate';
import { JsonDocumentAlreadyExistsError } from '../../../domain/errors/json-store.errors';
import { IJsonDocumentPayloadValidatorPort } from '../../../domain/ports/json-document-payload-validator.port';
import { IJsonDocumentRepository } from '../../../domain/repositories/json-document.repository';
import { JsonDocumentResponseDto } from '../../dtos/json-document.dtos';
import { JsonDocumentResponseMapper } from '../../mappers/json-document-response.mapper';
import { CreateJsonDocumentCommand } from './create-json-document.command';

@CommandHandler(CreateJsonDocumentCommand)
@Injectable()
export class CreateJsonDocumentHandler
  implements ICommandHandler<CreateJsonDocumentCommand, JsonDocumentResponseDto>
{
  constructor(
    @Inject(IJsonDocumentRepository)
    private readonly repo: IJsonDocumentRepository,
    @Inject(IJsonDocumentPayloadValidatorPort)
    private readonly payloadValidator: IJsonDocumentPayloadValidatorPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ params }: CreateJsonDocumentCommand): Promise<JsonDocumentResponseDto> {
    this.payloadValidator.validate(params.namespace, params.key, params.payload);

    const existing = await this.repo.findByKey(params.key, params.namespace);
    if (existing) {
      throw new JsonDocumentAlreadyExistsError(params.key, params.namespace);
    }

    const document = JsonDocument.create({
      key: params.key,
      namespace: params.namespace,
      payload: params.payload,
    });

    await this.repo.create(document);

    const events = [...document.domainEvents];
    document.clearEvents();
    this.eventBus.publishAll(events);

    return JsonDocumentResponseMapper.toDto(document);
  }
}
