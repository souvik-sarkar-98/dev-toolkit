# `@ssdev-toolkit/nestjs-document-generator`

Excel and PDF builders (ExcelJS / PDFKit). No Prisma, no CQRS — a Nest module around document services.

## Install

```bash
npm install @ssdev-toolkit/nestjs-document-generator
```

Host dependencies typically include `exceljs` and `pdfkit` (already used by this monorepo).

## What it does

- `DocumentGeneratorModule.forRoot()` — global `DocumentGeneratorService`
- `ExcelBuilderService` / `ExcelStyles` fluent sheets
- PDF builder types (`IPdfBuilder`, tables, text options)

## Usage

```ts
DocumentGeneratorModule.forRoot({ /* fonts, page defaults */ });
```

```ts
const excel = this.documents.createExcelBuilder();
const pdf = this.documents.createPdfBuilder('pdfkit');
```

Keep generated files as bytes or host storage uploads; this package does not talk to DMS by itself.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-document-generator
```

Overview: [root README](../../../README.md).
