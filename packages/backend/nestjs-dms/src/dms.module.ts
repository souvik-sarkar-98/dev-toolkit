import { HttpModule } from '@nestjs/axios';
import {
  DynamicModule,
  Inject,
  Injectable,
  Module,
  Optional,
  Provider,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import * as admin from 'firebase-admin';
import {
  BaseDynamicModule,
  BaseModuleValidator,
  DynamicModuleAsyncOptions,
  IEntityAccessPort,
  OAUTH_ACCESS_TOKEN_PORT,
  registerModuleValidator,
} from '@ssdev-toolkit/nestjs-core';
import { DmsModuleOptions, Dms2OptionsSchema } from './dms.schema';
import { IDocumentEntityAccessPort } from './domain/ports/entity-access.port';
import { IStorageProvider } from './domain/ports/storage.port';
import { IDocumentRepository } from './domain/repositories/document.repository';
import { DMS2_OPTIONS } from './infrastructure/dms-options.token';
import { FIREBASE_ADMIN } from './infrastructure/firebase-admin.token';
import { FirebaseStorageService } from './infrastructure/storage/firebase-storage.service';
import { FirebaseStorageAdapter } from './infrastructure/storage/firebase-storage.adapter';
import { UploadDocumentHandler } from './application/commands/upload-document/upload-document.handler';
import { DeleteDocumentHandler } from './application/commands/delete-document/delete-document.handler';
import { RenameDocumentHandler } from './application/commands/rename-document/rename-document.handler';
import { ListDocumentsHandler } from './application/queries/list-documents/list-documents.handler';
import { GetSignedUrlHandler } from './application/queries/get-signed-url/get-signed-url.handler';
import { DownloadDocumentHandler } from './application/queries/download-document/download-document.handler';
import { OnDocumentUploadedHandler } from './application/handlers/events/on-document-uploaded/on-document-uploaded.handler';
import { OnDocumentDeletedHandler } from './application/handlers/events/on-document-deleted/on-document-deleted.handler';
import { Dms2Controller } from './presentation/controllers/dms.controller';
import { DmsFacade } from './application/services/dms.facade';

export interface DmsModuleAsyncOptions
  extends DynamicModuleAsyncOptions<DmsModuleOptions> {
  storageProvider?: Provider;
}

const DMS_MODULE_VALIDATOR = Symbol('DmsModule.internalValidator');

const ENTITY_ACCESS_PORT_MISSING_MSG =
  '[DmsModule] IDocumentEntityAccessPort is not provided. ' +
  'Document read/write access will NOT be restricted by record-level entity checks — ' +
  'any authenticated user with the required permission can access documents on any entityType/entityId. ' +
  'Fix: implement IEntityAccessPort in your app, register ' +
  '{ provide: IDocumentEntityAccessPort, useClass: MyAdapter }, ' +
  'export the token from a module, and add that module to the ' +
  'imports array of DmsModule.forRoot() / forRootAsync().';

@Injectable()
class DmsModuleValidator extends BaseModuleValidator {
  constructor(
    moduleRef: ModuleRef,
    @Inject(DMS2_OPTIONS) private readonly options: DmsModuleOptions,
    @Optional()
    @Inject(IDocumentEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) {
    super(moduleRef);
  }

  protected getModuleName(): string {
    return 'DmsModule';
  }

  protected validateModule(): void {
    this.requirePort(
      IDocumentRepository,
      'Register IDocumentRepository in PersistenceModule and import PersistenceModule before DmsModule.',
    );

    if (this.options.provider === 'google-drive') {
      this.requirePort(
        OAUTH_ACCESS_TOKEN_PORT,
        'Register { provide: OAUTH_ACCESS_TOKEN_PORT, useClass: TokenVaultOAuthAccessTokenAdapter } in IntegrationsModule. Requires TokenVaultModule with Google OAuth configured.',
      );
      this.requirePort(
        IStorageProvider,
        'Pass storageProvider override with GoogleDriveStorageAdapter from apps/api/src/integrations/dms when provider is google-drive.',
      );
    }

    if (!this.accessPort) {
      this.warn(ENTITY_ACCESS_PORT_MISSING_MSG);
    }
  }
}

const COMMAND_HANDLERS = [
  UploadDocumentHandler,
  DeleteDocumentHandler,
  RenameDocumentHandler,
];

const QUERY_HANDLERS = [
  ListDocumentsHandler,
  GetSignedUrlHandler,
  DownloadDocumentHandler,
];

const EVENT_HANDLERS = [OnDocumentUploadedHandler, OnDocumentDeletedHandler];

@Module({})
export class DmsModule extends BaseDynamicModule {
  static forRoot(
    options: DmsModuleOptions = {} as DmsModuleOptions,
    overrides: { storageProvider?: Provider; imports?: any[] } = {},
  ): DynamicModule {
    return DmsModule._build(
      [DmsModule.createOptionsProvider(DMS2_OPTIONS, Dms2OptionsSchema, options)],
      overrides.imports ?? [],
      overrides.storageProvider,
    );
  }

  static forRootAsync(options: DmsModuleAsyncOptions): DynamicModule {
    return DmsModule._build(
      [
        {
          ...DmsModule.createAsyncOptionsProvider(DMS2_OPTIONS, Dms2OptionsSchema, options),
        },
      ],
      options.imports,
      options.storageProvider,
    );
  }

  private static _build(
    optionsProviders: any[],
    extraImports: any[] = [],
    storageProviderOverride?: Provider,
  ): DynamicModule {
    const firebaseAdminProvider: Provider = {
      provide: FIREBASE_ADMIN,
      useFactory: (opts: DmsModuleOptions): admin.app.App | null => {
        if (opts.provider !== 'firebase' || !opts.firebase?.serviceAccount) return null;
        const sa =
          typeof opts.firebase.serviceAccount === 'string'
            ? JSON.parse(opts.firebase.serviceAccount)
            : opts.firebase.serviceAccount;
        const appName = `dms-${opts.firebase.projectId ?? 'default'}`;
        const existingApp = admin.apps.find((a) => a?.name === appName) ?? null;
        if (existingApp) return existingApp;
        return admin.initializeApp(
          {
            credential: admin.credential.cert(sa as admin.ServiceAccount),
            storageBucket: opts.firebase.storageBucket,
            projectId: opts.firebase.projectId,
          },
          appName,
        );
      },
      inject: [DMS2_OPTIONS],
    };

    const storageProviderBinding: Provider = storageProviderOverride ?? {
      provide: IStorageProvider,
      useFactory: (opts: DmsModuleOptions, firebaseAdapter: FirebaseStorageAdapter) => {
        if (opts.provider === 'google-drive') {
          throw new Error(
            '[DmsModule] provider=google-drive requires a storageProvider override from the host (GoogleDriveStorageAdapter).',
          );
        }
        return firebaseAdapter;
      },
      inject: [DMS2_OPTIONS, FirebaseStorageAdapter],
    };

    return {
      module: DmsModule,
      imports: [...(extraImports ?? []), CqrsModule, HttpModule],
      controllers: [Dms2Controller],
      providers: [
        ...optionsProviders,
        registerModuleValidator(DMS_MODULE_VALIDATOR, DmsModuleValidator),
        firebaseAdminProvider,
        FirebaseStorageService,
        FirebaseStorageAdapter,
        storageProviderBinding,
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
        ...EVENT_HANDLERS,
        DmsFacade,
      ],
      exports: [DMS2_OPTIONS, DmsFacade],
    };
  }
}
