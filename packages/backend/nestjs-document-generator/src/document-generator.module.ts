import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  DocumentGeneratorModuleOptions,
  DocumentGeneratorOptionsSchema,
} from './document-generator.schema';
import { DOCUMENT_GENERATOR_OPTIONS } from './infrastructure/document-generator-options.token';
import { DocumentGeneratorService } from './services/document-generator.service';

@Global()
@Module({})
export class DocumentGeneratorModule {
  static forRoot(options: DocumentGeneratorModuleOptions = {}): DynamicModule {
    const parsed = DocumentGeneratorOptionsSchema.parse(options);
    return {
      module: DocumentGeneratorModule,
      global: true,
      providers: [
        { provide: DOCUMENT_GENERATOR_OPTIONS, useValue: parsed },
        DocumentGeneratorService,
      ],
      exports: [DocumentGeneratorService],
    };
  }
}
