import { DynamicModule, Inject, Injectable, Module, Optional, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import {
  BaseDynamicModule,
  BaseModuleValidator,
  DynamicModuleAsyncOptions,
  IEntityAccessPort,
  registerModuleValidator,
} from '@ssdev-toolkit/nestjs-core';
import {
  CustomFormsModuleOptions,
  CustomFormsOptionsSchema,
} from './custom-forms.schema';
import { CUSTOM_FORMS_OPTIONS } from './infrastructure/custom-forms-options.token';
import { ICustomFormEntityAccessPort } from './domain/ports/entity-access.port';
import { IFormRepository } from './domain/repositories/form.repository';
import { IFormSubmissionRepository } from './domain/repositories/form-submission.repository';

// Application — Commands
import { CreateFormHandler } from './application/commands/create-form/create-form.handler';
import { UpdateFormHandler } from './application/commands/update-form/update-form.handler';
import { PublishFormHandler } from './application/commands/publish-form/publish-form.handler';
import { DisableFormHandler } from './application/commands/disable-form/disable-form.handler';
import { AddFormFieldHandler } from './application/commands/add-form-field/add-form-field.handler';
import { UpdateFormFieldHandler } from './application/commands/update-form-field/update-form-field.handler';
import { DisableFormFieldHandler } from './application/commands/disable-form-field/disable-form-field.handler';
import { BulkUpdateFieldSortOrderHandler } from './application/commands/bulk-update-field-sort-order/bulk-update-field-sort-order.handler';
import { SaveFormDraftHandler } from './application/commands/save-form-draft/save-form-draft.handler';
import { SubmitFormHandler } from './application/commands/submit-form/submit-form.handler';
import { ClearFormSubmissionHandler } from './application/commands/clear-form-submission/clear-form-submission.handler';

// Application — Queries
import { ListFormsHandler } from './application/queries/list-forms/list-forms.handler';
import { GetFormWithFieldsHandler } from './application/queries/get-form-with-fields/get-form-with-fields.handler';
import { GetFormSubmissionHandler } from './application/queries/get-form-submission/get-form-submission.handler';
import { GetFormSubmissionHistoryHandler } from './application/queries/get-form-submission-history/get-form-submission-history.handler';
import { GetPublishedFormByKeyHandler } from './application/queries/get-published-form-by-key/get-published-form-by-key.handler';
import { ValidateFormSubmissionHandler } from './application/queries/validate-form-submission/validate-form-submission.handler';

// Infrastructure — Services
import { FieldValueCodecService } from './infrastructure/services/field-value-codec.service';
import { FormSubmissionValidationService } from './application/services/form-submission-validation.service';
import { CustomFormsFacade } from './application/services/custom-forms.facade';

// Presentation
import { FormController } from './presentation/controllers/form.controller';
import { FormFieldController } from './presentation/controllers/form-field.controller';
import { FormSubmissionController } from './presentation/controllers/form-submission.controller';

export interface CustomFormsModuleAsyncOptions
  extends DynamicModuleAsyncOptions<CustomFormsModuleOptions> { }

const CUSTOM_FORMS_MODULE_VALIDATOR = Symbol('CustomFormsModule.internalValidator');

const ENTITY_ACCESS_PORT_MISSING_MSG =
  '[CustomFormsModule] ICustomFormEntityAccessPort is not provided. ' +
  'Form read/write access will NOT be restricted by record-level entity checks — ' +
  'any authenticated user with the required permission can access forms on any entityType/entityId. ' +
  'Fix: implement IEntityAccessPort in your app, register ' +
  '{ provide: ICustomFormEntityAccessPort, useClass: MyAdapter }, ' +
  'export the token from a module, and add that module to the imports array of CustomFormsModule.forRoot() / forRootAsync().';

@Injectable()
class CustomFormsModuleValidator extends BaseModuleValidator {
  constructor(
    moduleRef: ModuleRef,
    @Optional()
    @Inject(ICustomFormEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) {
    super(moduleRef);
  }

  protected getModuleName(): string {
    return 'CustomFormsModule';
  }

  protected validateModule(): void {
    this.requirePort(
      IFormRepository,
      'Register IFormRepository in PersistenceModule and import PersistenceModule before CustomFormsModule.',
    );
    this.requirePort(
      IFormSubmissionRepository,
      'Register IFormSubmissionRepository in PersistenceModule and import PersistenceModule before CustomFormsModule.',
    );

    if (!this.accessPort) {
      this.warn(ENTITY_ACCESS_PORT_MISSING_MSG);
    }
  }
}

const COMMAND_HANDLERS = [
  CreateFormHandler,
  UpdateFormHandler,
  PublishFormHandler,
  DisableFormHandler,
  AddFormFieldHandler,
  UpdateFormFieldHandler,
  DisableFormFieldHandler,
  BulkUpdateFieldSortOrderHandler,
  SaveFormDraftHandler,
  SubmitFormHandler,
  ClearFormSubmissionHandler,
];

const QUERY_HANDLERS = [
  ListFormsHandler,
  GetFormWithFieldsHandler,
  GetFormSubmissionHandler,
  GetFormSubmissionHistoryHandler,
  GetPublishedFormByKeyHandler,
  ValidateFormSubmissionHandler,
];

/**
 * CustomFormsModule — DDD-compliant dynamic custom forms module.
 *
 * Supports per-entity-type form definitions, field management, draft/submit
 * workflows, validation, value history, and form-level permission checks.
 *
 * ## Registration
 *
 * ```ts
 * CustomFormsModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     allowedEntityTypes: [{ entityType: 'donation' }],
 *     encryptionKey: config.get('APP_SECRET'),
 *   }),
 * })
 * ```
 */
@Module({})
export class CustomFormsModule extends BaseDynamicModule {
  static forRoot(options: CustomFormsModuleOptions = {}): DynamicModule {
    return CustomFormsModule._build([
      CustomFormsModule.createOptionsProvider(
        CUSTOM_FORMS_OPTIONS,
        CustomFormsOptionsSchema,
        options,
      ),
    ]);
  }

  static forRootAsync(options: CustomFormsModuleAsyncOptions): DynamicModule {
    const module = CustomFormsModule._build([
      CustomFormsModule.createAsyncOptionsProvider(
        CUSTOM_FORMS_OPTIONS,
        CustomFormsOptionsSchema,
        options,
      ),
    ]);
    return {
      ...module,
      imports: [...(options.imports ?? []), ...(module.imports ?? [])],
    };
  }

  private static _build(optionsProviders: Provider[]): DynamicModule {
    return {
      global: true,
      module: CustomFormsModule,
      imports: [CqrsModule],
      controllers: [
        FormController,
        FormFieldController,
        FormSubmissionController,
      ],
      providers: [
        ...optionsProviders,
        registerModuleValidator(CUSTOM_FORMS_MODULE_VALIDATOR, CustomFormsModuleValidator),
        FieldValueCodecService,
        FormSubmissionValidationService,
        CustomFormsFacade,
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
      ],
      exports: [
        CUSTOM_FORMS_OPTIONS,
        FieldValueCodecService,
        FormSubmissionValidationService,
        CustomFormsFacade,
      ],
    };
  }
}
