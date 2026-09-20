import 'reflect-metadata';

// Break the auth → @nestjs/axios → axios import chain that occurs when the
// controller is loaded. The module spec only inspects the static DynamicModule
// object, so these dependencies are never actually exercised.
jest.mock('@ssdev-toolkit/nestjs-auth', () => ({
  UnifiedAuthGuard: class MockUnifiedAuthGuard { },
  RequirePermissions: () => () => { },
  PermissionsGuard: class MockPermissionsGuard { },
}));

import { JsonStoreModule } from './json-store.module';
import { CqrsModule } from '@nestjs/cqrs';
import { JsonStoreFacade } from './application/services/json-store.facade';
import { JsonDocumentController } from './presentation/controllers/json-document.controller';
import { CreateJsonDocumentHandler } from './application/commands/create-json-document/create-json-document.handler';
import { UpdateJsonDocumentHandler } from './application/commands/update-json-document/update-json-document.handler';
import { UpsertJsonDocumentHandler } from './application/commands/upsert-json-document/upsert-json-document.handler';
import { DeleteJsonDocumentHandler } from './application/commands/delete-json-document/delete-json-document.handler';
import { GetJsonDocumentHandler } from './application/queries/get-json-document/get-json-document.handler';
import { ListJsonDocumentsHandler } from './application/queries/list-json-documents/list-json-documents.handler';
import { IJsonDocumentPayloadValidatorPort } from './domain/ports/json-document-payload-validator.port';
import { NoOpJsonDocumentPayloadValidator } from './domain/ports/no-op-json-document-payload-validator';

describe('JsonStoreModule.forRoot()', () => {
  describe('without options (defaults)', () => {
    let module: ReturnType<typeof JsonStoreModule.forRoot>;

    beforeEach(() => {
      module = JsonStoreModule.forRoot();
    });

    it('returns a DynamicModule', () => {
      expect(module).toBeDefined();
      expect(module.module).toBe(JsonStoreModule);
    });

    it('imports CqrsModule', () => {
      expect(module.imports).toContain(CqrsModule);
    });

    it('does not expose the HTTP controller by default', () => {
      expect(module.controllers).not.toContain(JsonDocumentController);
    });

    it('registers all command handlers as providers', () => {
      const providers = module.providers as any[];

      expect(providers).toContain(CreateJsonDocumentHandler);
      expect(providers).toContain(UpdateJsonDocumentHandler);
      expect(providers).toContain(UpsertJsonDocumentHandler);
      expect(providers).toContain(DeleteJsonDocumentHandler);
    });

    it('registers all query handlers as providers', () => {
      const providers = module.providers as any[];

      expect(providers).toContain(GetJsonDocumentHandler);
      expect(providers).toContain(ListJsonDocumentsHandler);
    });

    it('registers JsonStoreFacade as a provider', () => {
      const providers = module.providers as any[];

      expect(providers).toContain(JsonStoreFacade);
    });

    it('exports JsonStoreFacade', () => {
      expect(module.exports).toContain(JsonStoreFacade);
    });

    it('registers NoOpJsonDocumentPayloadValidator by default', () => {
      const providers = module.providers as any[];
      const validatorProvider = providers.find(
        (p) => p?.provide === IJsonDocumentPayloadValidatorPort,
      );

      expect(validatorProvider?.useClass).toBe(NoOpJsonDocumentPayloadValidator);
    });
  });

  describe('with exposeController: true', () => {
    it('registers the JsonDocumentController', () => {
      const module = JsonStoreModule.forRoot({ exposeController: true });

      expect(module.controllers).toContain(JsonDocumentController);
    });
  });

  describe('with exposeController: false', () => {
    it('does not register the controller', () => {
      const module = JsonStoreModule.forRoot({ exposeController: false });

      expect(module.controllers).not.toContain(JsonDocumentController);
    });
  });
});
