import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateJsonDocumentCommand } from '../commands/create-json-document/create-json-document.command';
import { UpdateJsonDocumentCommand } from '../commands/update-json-document/update-json-document.command';
import { UpsertJsonDocumentCommand } from '../commands/upsert-json-document/upsert-json-document.command';
import { DeleteJsonDocumentCommand } from '../commands/delete-json-document/delete-json-document.command';
import { GetJsonDocumentQuery } from '../queries/get-json-document/get-json-document.query';
import { ListJsonDocumentsQuery } from '../queries/list-json-documents/list-json-documents.query';
import { JsonDocumentResponseDto } from '../dtos/json-document.dtos';
import {
  JsonDocumentKeyNotFoundError,
  JsonDocumentNotFoundError,
} from '../../domain/errors/json-store.errors';

/**
 * Programmatic entry point for consumers that do not go through HTTP.
 * Correspondence (and any other module) injects this facade to store and
 * retrieve JSON documents without coupling to the HTTP controller.
 */
@Injectable()
export class JsonStoreFacade {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /** Creates a new JSON document. Throws if (key, namespace) already exists. */
  create(
    key: string,
    namespace: string,
    payload: Record<string, unknown>,
  ): Promise<JsonDocumentResponseDto> {
    return this.commandBus.execute(
      new CreateJsonDocumentCommand({ key, namespace, payload }),
    );
  }

  /**
   * Creates or replaces a JSON document identified by (key, namespace).
   * This is the recommended method for correspondence to seed/update email templates.
   */
  upsert(
    key: string,
    namespace: string,
    payload: Record<string, unknown>,
  ): Promise<JsonDocumentResponseDto> {
    return this.commandBus.execute(
      new UpsertJsonDocumentCommand({ key, namespace, payload }),
    );
  }

  /** Updates the payload of an existing document by its id. */
  update(id: string, payload: Record<string, unknown>): Promise<JsonDocumentResponseDto> {
    return this.commandBus.execute(
      new UpdateJsonDocumentCommand({ id, payload }),
    );
  }

  /** Deletes a document by its id. */
  delete(id: string): Promise<void> {
    return this.commandBus.execute(new DeleteJsonDocumentCommand({ id }));
  }

  /** Retrieves a document by its (key, namespace) pair. Returns null if not found. */
  async get(key: string, namespace: string): Promise<Record<string, unknown> | null> {
    try {
      const dto: JsonDocumentResponseDto = await this.queryBus.execute(
        new GetJsonDocumentQuery({ key, namespace }),
      );
      return dto.payload;
    } catch (e) {
      if (e instanceof JsonDocumentKeyNotFoundError || e instanceof JsonDocumentNotFoundError) {
        return null;
      }
      throw e;
    }
  }

  /** Retrieves the full DTO for a document by its (key, namespace) pair. Returns null if not found. */
  async getDto(key: string, namespace: string): Promise<JsonDocumentResponseDto | null> {
    try {
      return await this.queryBus.execute(
        new GetJsonDocumentQuery({ key, namespace }),
      );
    } catch (e) {
      if (e instanceof JsonDocumentKeyNotFoundError || e instanceof JsonDocumentNotFoundError) {
        return null;
      }
      throw e;
    }
  }

  /** Retrieves a document by its id. */
  getById(id: string): Promise<JsonDocumentResponseDto> {
    return this.queryBus.execute(new GetJsonDocumentQuery({ id }));
  }

  /** Lists all documents, optionally filtered by namespace. */
  list(namespace?: string): Promise<JsonDocumentResponseDto[]> {
    return this.queryBus.execute(new ListJsonDocumentsQuery({ namespace }));
  }
}
