import { DynamicModule, Injectable, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { BaseModuleValidator, registerModuleValidator } from '@ssdev-toolkit/nestjs-core';
import { JsonStoreModuleOptions } from './json-store.schema';

import { CreateJsonDocumentHandler } from './application/commands/create-json-document/create-json-document.handler';
import { UpdateJsonDocumentHandler } from './application/commands/update-json-document/update-json-document.handler';
import { UpsertJsonDocumentHandler } from './application/commands/upsert-json-document/upsert-json-document.handler';
import { DeleteJsonDocumentHandler } from './application/commands/delete-json-document/delete-json-document.handler';

import { GetJsonDocumentHandler } from './application/queries/get-json-document/get-json-document.handler';
import { ListJsonDocumentsHandler } from './application/queries/list-json-documents/list-json-documents.handler';

import { JsonStoreFacade } from './application/services/json-store.facade';

import { IJsonDocumentPayloadValidatorPort } from './domain/ports/json-document-payload-validator.port';
import { NoOpJsonDocumentPayloadValidator } from './domain/ports/no-op-json-document-payload-validator';
import { IJsonDocumentRepository } from './domain/repositories/json-document.repository';
import { JsonDocumentController } from './presentation/controllers/json-document.controller';

const JSON_STORE_MODULE_VALIDATOR = Symbol('JsonStoreModule.internalValidator');

@Injectable()
class JsonStoreModuleValidator extends BaseModuleValidator {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }

  protected getModuleName(): string {
    return 'JsonStoreModule';
  }

  protected validateModule(): void {
    this.requirePort(
      IJsonDocumentRepository,
      'Register IJsonDocumentRepository in PersistenceModule and import PersistenceModule before JsonStoreModule.',
    );
  }
}

@Module({})
export class JsonStoreModule {
  static forRoot(options: JsonStoreModuleOptions = {}): DynamicModule {
    return {
      module: JsonStoreModule,
      imports: [CqrsModule],
      controllers: options.exposeController ? [JsonDocumentController] : [],
      providers: [
        registerModuleValidator(JSON_STORE_MODULE_VALIDATOR, JsonStoreModuleValidator),
        CreateJsonDocumentHandler,
        UpdateJsonDocumentHandler,
        UpsertJsonDocumentHandler,
        DeleteJsonDocumentHandler,
        GetJsonDocumentHandler,
        ListJsonDocumentsHandler,
        {
          provide: IJsonDocumentPayloadValidatorPort,
          useClass: options.payloadValidator ?? NoOpJsonDocumentPayloadValidator,
        },
        JsonStoreFacade,
      ],
      exports: [JsonStoreFacade],
    };
  }
}
