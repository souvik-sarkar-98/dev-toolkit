import { IDocumentOptions } from './common.interface';

/**
 * PDF Generator Interfaces
 */

export type PdfPageSize = 'A4' | 'A3' | 'LETTER' | 'LEGAL' | 'TABLOID';
export type PdfPageOrientation = 'portrait' | 'landscape';
export type PdfTextAlign = 'left' | 'center' | 'right' | 'justify';
export type PdfFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

export interface IPdfFontOptions {
    size?: number;
    family?: string;
    style?: PdfFontStyle;
    color?: string;
}

export interface IPdfTextOptions extends IPdfFontOptions {
    align?: PdfTextAlign;
    lineGap?: number;
    paragraphGap?: number;
    indent?: number;
    columns?: number;
    columnGap?: number;
    underline?: boolean;
    strike?: boolean;
    link?: string;
}

export interface IPdfImageOptions {
    width?: number;
    height?: number;
    fit?: [number, number];
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'center' | 'bottom';
}

export interface IPdfTableColumn {
    header: string;
    width?: number | 'auto' | '*';
    align?: PdfTextAlign;
}

export interface IPdfTableOptions {
    columns: IPdfTableColumn[];
    headerBackground?: string;
    headerTextColor?: string;
    headerFontSize?: number;
    rowFontSize?: number;
    alternateRowColor?: string;
    borderColor?: string;
    borderWidth?: number;
    cellPadding?: number;
}

export interface IPdfDocumentOptions extends IDocumentOptions {
    pageSize?: PdfPageSize;
    orientation?: PdfPageOrientation;
    compress?: boolean;
    autoFirstPage?: boolean;
    watermark?: {
        text?: string;
        image?: string | Buffer;
        opacity?: number;
        fontSize?: number;
        color?: string;
        angle?: number;
        position?: 'center' | 'diagonal';
    };
    header?: {
        title?: string;
        subtitle?: string;
        logoLeft?: string | Buffer;
        logoRight?: string | Buffer;
        logoCentered?: string | Buffer;
        logoWidth?: number;
        logoHeight?: number;
        backgroundColor?: string;
        textColor?: string;
        date?: string;
    };
    footer?: {
        text?: string;
        pageNumbers?: boolean;
        alignment?: 'left' | 'center' | 'right';
    };
    showBorder?: boolean;
    borderOptions?: {
        color?: string;
        thickness?: number;
        padding?: number;
    };
    accentColor?: string;
    fontFamily?: string;
    customFonts?: {
        name: string;
        path: string;
        style?: PdfFontStyle;
    }[];
}

export type PdfTableCellValue = string | number | boolean | Date | null | undefined;
export type PdfTableRow = PdfTableCellValue[];

export interface IPdfTocEntry {
    title: string;
    page: string | number;
}

export interface IPdfHeadingOptions extends IPdfTextOptions {
    level?: 1 | 2 | 3 | 4;
}

export interface IPdfTocTextOptions extends IPdfTextOptions {
    isTOC?: boolean;
}

export interface IPdfListOptions {
    ordered?: boolean;
    bulletChar?: string;
    indent?: number;
}

export interface IPdfDividerOptions {
    color?: string;
    thickness?: number;
}

export interface IPdfSignatureOptions {
    label?: string;
    dateLabel?: string;
    space?: number;
}

/** Values a Handlebars template may receive through {@link IPdfTemplateData}. */
export type PdfTemplateValue =
    | string
    | number
    | boolean
    | Date
    | null
    | undefined
    | PdfTemplateValue[]
    | { [key: string]: PdfTemplateValue };

export interface IPdfTemplateData {
    [key: string]: PdfTemplateValue;
}

export type IPdfSectionContent =
    | { type: 'heading'; data: string; options?: IPdfHeadingOptions }
    | { type: 'paragraph'; data: string; options?: IPdfTextOptions }
    | { type: 'text'; data: string | IPdfTocEntry; options?: IPdfTocTextOptions }
    | { type: 'image'; data: string | Buffer; options?: IPdfImageOptions }
    | { type: 'table'; data: PdfTableRow[]; options?: IPdfTableOptions }
    | { type: 'list'; data: string[]; options?: IPdfListOptions }
    | { type: 'divider'; data: null; options?: IPdfDividerOptions }
    | { type: 'space'; data: number; options?: IPdfTextOptions }
    | { type: 'pageBreak'; data: null; options?: IPdfTextOptions }
    | { type: 'signature'; data: null; options?: IPdfSignatureOptions };

export interface IPdfSection {
    title?: string;
    contents: IPdfSectionContent[];
}

/**
 * Unified PDF Builder Interface
 * Supports both fluent building (PDFKit/Puppeteer) and template building (Puppeteer)
 */
export interface IPdfBuilder {
    setOptions(options: IPdfDocumentOptions): IPdfBuilder;

    // Fluent methods
    addSection(title?: string): IPdfSectionBuilder;
    addPageBreak(): IPdfBuilder;

    // Build methods
    build(): Promise<Buffer>;
    buildStream?(): NodeJS.ReadableStream;
}

export interface IPdfSectionBuilder {
    addHeading(text: string, level?: 1 | 2 | 3 | 4, options?: IPdfTextOptions): IPdfSectionBuilder;
    addParagraph(text: string, options?: IPdfTextOptions): IPdfSectionBuilder;
    addText(text: string, options?: IPdfTextOptions): IPdfSectionBuilder;
    addImage(source: string | Buffer, options?: IPdfImageOptions): IPdfSectionBuilder;
    addTable(data: PdfTableRow[], options?: IPdfTableOptions): IPdfSectionBuilder;
    addList(items: string[], options?: IPdfListOptions): IPdfSectionBuilder;
    addDivider(options?: IPdfDividerOptions): IPdfSectionBuilder;
    addSpace(height?: number): IPdfSectionBuilder;
    addTOCEntry(title: string, page: string | number, options?: IPdfTextOptions): IPdfSectionBuilder;
    addSignatureSection(options?: IPdfSignatureOptions): IPdfSectionBuilder;
    endSection(): IPdfBuilder;
}
