import { Inject, Injectable, Optional } from '@nestjs/common';
import { DocumentGeneratorModuleOptions } from '../document-generator.schema';
import { DOCUMENT_GENERATOR_OPTIONS } from '../infrastructure/document-generator-options.token';
import { PdfBuilderService } from './pdf-builder.service';
import { ExcelBuilderService } from './excel-builder.service';
import { PuppeteerPdfBuilderService } from './puppeteer-pdf-builder.service';
import { IPdfBuilder } from '../interfaces/pdf-generator.interface';

@Injectable()
export class DocumentGeneratorService {
  constructor(
    @Optional()
    @Inject(DOCUMENT_GENERATOR_OPTIONS)
    private readonly options: DocumentGeneratorModuleOptions = {},
  ) {}

  createPdfBuilder(engine: 'pdfkit' | 'puppeteer' = 'pdfkit'): IPdfBuilder {
    if (engine === 'puppeteer') {
      return new PuppeteerPdfBuilderService(this.resolveTemplatesDir());
    }
    return new PdfBuilderService();
  }

  createExcelBuilder(): ExcelBuilderService {
    return new ExcelBuilderService(this.options.watermarkPath);
  }

  private resolveTemplatesDir(): string | undefined {
    if (this.options.templatesDir) {
      return this.options.templatesDir;
    }
    const path = require('path') as typeof import('path');
    const fs = require('fs') as typeof import('fs');
    const distTemplates = path.join(__dirname, 'templates');
    if (fs.existsSync(distTemplates)) {
      return distTemplates;
    }
    return path.join(__dirname, '..', 'templates');
  }
}
