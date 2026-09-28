import type * as puppeteerType from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import {
    IPdfBuilder,
    IPdfSectionBuilder,
    IPdfDocumentOptions,
    IPdfTextOptions,
    IPdfImageOptions,
    IPdfTableColumn,
    IPdfTableOptions,
    IPdfSectionContent,
    IPdfDividerOptions,
    IPdfListOptions,
    IPdfSignatureOptions,
    IPdfTemplateData,
    IPdfTocEntry,
    PdfPageSize,
    PdfTableCellValue,
    PdfTableRow,
    PdfTextAlign,
} from '../interfaces/pdf-generator.interface';

/** Shapes consumed by `document-template.hbs`. */
interface HtmlTableCell {
    value: PdfTableCellValue;
    align: PdfTextAlign;
}

interface HtmlTableRow {
    rowStyle: string;
    cells: HtmlTableCell[];
}

interface HtmlElement {
    type: IPdfSectionContent['type'];
    data: IPdfSectionContent['data'];
    style: string;
    level?: 1 | 2 | 3 | 4;
    isTOC?: boolean;
    imgStyle?: string;
    alignStyle?: string;
    tableStyle?: string;
    headerStyle?: string;
    borderColor?: string;
    borderWidth?: number;
    cellPadding?: number;
    columns?: IPdfTableColumn[];
    rows?: HtmlTableRow[];
    listTag?: 'ol' | 'ul';
    color?: string;
    thickness?: number;
    label?: string;
    dateLabel?: string;
    space?: number;
}

interface HtmlSection {
    title?: string;
    pageBreak?: boolean;
    elements: HtmlElement[];
}

/**
 * Puppeteer Section Builder - Implements same fluent API for HTML generation
 */
class HtmlSectionBuilder implements IPdfSectionBuilder {
    private contents: IPdfSectionContent[] = [];

    constructor(
        private readonly parentBuilder: PuppeteerPdfBuilderService,
        private readonly sectionTitle?: string,
    ) { }

    addHeading(text: string, level: 1 | 2 | 3 | 4 = 2, options?: IPdfTextOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'heading',
            data: text,
            options: { ...options, level },
        });
        return this;
    }

    addParagraph(text: string, options?: IPdfTextOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'paragraph',
            data: text,
            options,
        });
        return this;
    }

    addText(text: string, options?: IPdfTextOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'text',
            data: text,
            options,
        });
        return this;
    }

    addImage(source: string | Buffer, options?: IPdfImageOptions): IPdfSectionBuilder {
        // In Puppeteer, we might want to convert Buffer to Base64
        const data = source instanceof Buffer
            ? `data:image/png;base64,${source.toString('base64')}`
            : source;

        this.contents.push({
            type: 'image',
            data,
            options,
        });
        return this;
    }

    addTable(data: PdfTableRow[], options?: IPdfTableOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'table',
            data,
            options,
        });
        return this;
    }

    addList(items: string[], options?: IPdfListOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'list',
            data: items,
            options,
        });
        return this;
    }

    addDivider(options?: IPdfDividerOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'divider',
            data: null,
            options,
        });
        return this;
    }

    addSpace(height: number = 20): IPdfSectionBuilder {
        this.contents.push({
            type: 'space',
            data: height,
            options: {},
        });
        return this;
    }

    addSignatureSection(options?: IPdfSignatureOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'signature',
            data: null,
            options,
        });
        return this;
    }

    addTOCEntry(title: string, page: string | number, options?: IPdfTextOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'text',
            data: { title, page },
            options: { ...options, isTOC: true },
        });
        return this;
    }

    endSection(): IPdfBuilder {
        this.parentBuilder.registerSection({
            title: this.sectionTitle,
            contents: this.contents,
        });
        return this.parentBuilder;
    }
}

// Register global Handlebars helpers
handlebars.registerHelper('eq', (a, b) => a === b);

export class PuppeteerPdfBuilderService implements IPdfBuilder {
    private options: IPdfDocumentOptions = {};
    private templateName: string = 'document-template'; // Default template
    private templateData: IPdfTemplateData = {};
    private sections: { title?: string; contents: IPdfSectionContent[] }[] = [];
    private customStyles: string[] = [];

    private static readonly PAPER_FORMATS: Record<PdfPageSize, puppeteerType.PaperFormat> = {
        A4: 'a4',
        A3: 'a3',
        LETTER: 'letter',
        LEGAL: 'legal',
        TABLOID: 'tabloid',
    };

    constructor(private readonly templatesDir?: string) {}
    
    setOptions(options: IPdfDocumentOptions): IPdfBuilder {
        this.options = { ...this.options, ...options };
        return this;
    }

    setTemplate(templateName: string, data: IPdfTemplateData): IPdfBuilder {
        this.templateName = templateName;
        // Merged with the fluent data in build(); fluent values win on conflict.
        this.templateData = { ...this.templateData, ...data };
        return this;
    }

    addSection(title?: string): IPdfSectionBuilder {
        return new HtmlSectionBuilder(this, title);
    }

    addPageBreak(): IPdfBuilder {
        // Add a section that just contains a page break
        this.sections.push({
            contents: [{ type: 'pageBreak', data: null }]
        });
        return this;
    }

    registerSection(section: { title?: string; contents: IPdfSectionContent[] }): void {
        this.sections.push(section);
    }

    addStyle(css: string): IPdfBuilder {
        this.customStyles.push(css);
        return this;
    }

    async build(): Promise<Buffer> {
        let browser: puppeteerType.Browser | undefined;
        try {
            const puppeteer = await import('puppeteer');

            const { mappedSections, tocEntries } = this.prepareSectionsForHtml();

            // Map options and sections to template data
            const data = {
                ...this.templateData,
                title: this.options.header?.title,
                subtitle: this.options.header?.subtitle,
                date: this.options.header?.date || new Date().toLocaleDateString(),
                logo: this.options.header?.logoCentered || this.options.header?.logoLeft,
                accentColor: this.options.accentColor || '#2B5FA6',
                showBorder: this.options.showBorder,
                watermark: this.options.watermark?.text,
                toc: tocEntries.length > 0 ? tocEntries : undefined,
                sections: mappedSections
            };

            const templateHtml = this.loadTemplate(this.templateName);
            const compiledTemplate = handlebars.compile(templateHtml);
            let html = compiledTemplate(data);

            if (this.customStyles.length > 0) {
                const styleTag = `<style>${this.customStyles.join('\n')}</style>`;
                html = html.replace('</head>', `${styleTag}\n</head>`);
            }

            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            // setContent only accepts load/domcontentloaded; idle wait covers late assets.
            await page.setContent(html, { waitUntil: 'load' });
            await page.waitForNetworkIdle();

            const pdfOptions: puppeteerType.PDFOptions = {
                format: PuppeteerPdfBuilderService.PAPER_FORMATS[this.options.pageSize ?? 'A4'],
                landscape: this.options.orientation === 'landscape',
                printBackground: true,
                margin: {
                    top: this.options.margins?.top || 0,
                    bottom: this.options.margins?.bottom || 0,
                    left: this.options.margins?.left || 0,
                    right: this.options.margins?.right || 0,
                },
                displayHeaderFooter: !!(this.options.header || this.options.footer),
                headerTemplate: '', // Handled by main template
                footerTemplate: '', // Handled by main template
            };

            const pdfBuffer = await page.pdf(pdfOptions);
            return Buffer.from(pdfBuffer);
        } finally {
            if (browser) await browser.close();
        }
    }

    private prepareSectionsForHtml(): { mappedSections: HtmlSection[]; tocEntries: IPdfTocEntry[] } {
        const mappedSections: HtmlSection[] = [];
        const tocEntries: IPdfTocEntry[] = [];

        this.sections.forEach(s => {
            const section: HtmlSection = { title: s.title, elements: [] };
            const elements: HtmlElement[] = [];

            s.contents.forEach(c => {
                if (c.type === 'pageBreak') {
                    section.pageBreak = true;
                    return;
                }

                const element: HtmlElement = {
                    type: c.type,
                    data: c.data,
                    style: this.formatElementStyle(c)
                };

                // Type-specific processing
                switch (c.type) {
                    case 'heading':
                        element.level = c.options?.level || 2;
                        break;
                    case 'text':
                        if (c.options?.isTOC && typeof c.data === 'object') {
                            element.isTOC = true;
                            tocEntries.push(c.data);
                        }
                        break;
                    case 'image':
                        element.imgStyle = c.options?.width ? `width: ${c.options.width}px;` : 'max-width: 100%;';
                        element.alignStyle = c.options?.align ? `text-align: ${c.options.align};` : '';
                        break;
                    case 'table': {
                        const options: IPdfTableOptions | undefined = c.options;
                        element.tableStyle = `width: 100%; border-collapse: collapse; margin: 20px 0; border: ${options?.borderWidth || 1}px solid ${options?.borderColor || '#e5e7eb'}; font-size: ${options?.rowFontSize || 10}pt;`;
                        element.headerStyle = `background-color: ${options?.headerBackground || '#f8fafc'}; color: ${options?.headerTextColor || '#333'}; font-size: ${options?.headerFontSize || 10}pt;`;
                        element.borderColor = options?.borderColor || '#e5e7eb';
                        element.borderWidth = options?.borderWidth || 1;
                        element.cellPadding = options?.cellPadding || 8;
                        element.columns = options?.columns || [];
                        element.rows = c.data.map((row, rowIndex) => ({
                            rowStyle: options?.alternateRowColor && rowIndex % 2 === 1 ? `background-color: ${options.alternateRowColor};` : '',
                            cells: row.map((cell, cellIndex) => ({
                                value: cell,
                                align: options?.columns?.[cellIndex]?.align || 'left'
                            }))
                        }));
                        break;
                    }
                    case 'list':
                        element.listTag = c.options?.ordered ? 'ol' : 'ul';
                        break;
                    case 'divider':
                        element.color = c.options?.color || '#eee';
                        element.thickness = c.options?.thickness || 1;
                        break;
                    case 'signature':
                        element.label = c.options?.label || 'Signature';
                        element.dateLabel = c.options?.dateLabel || 'Date';
                        element.space = c.options?.space || 60;
                        break;
                }

                elements.push(element);
            });

            section.elements = elements;
            mappedSections.push(section);
        });

        return { mappedSections, tocEntries };
    }

    /** Inline style for the element wrapper; only text-like content carries typography. */
    private formatElementStyle(content: IPdfSectionContent): string {
        switch (content.type) {
            case 'heading':
            case 'paragraph':
            case 'text':
            case 'space':
                return this.formatTextOptions(content.options);
            default:
                return '';
        }
    }

    private formatTextOptions(options?: IPdfTextOptions): string {
        if (!options) return '';
        const styles: string[] = [];
        if (options.size) styles.push(`font-size: ${options.size}pt`);
        if (options.color) styles.push(`color: ${options.color}`);
        if (options.align) styles.push(`text-align: ${options.align}`);
        if (options.style === 'bold' || options.style === 'bolditalic') styles.push('font-weight: bold');
        if (options.style === 'italic' || options.style === 'bolditalic') styles.push('font-style: italic');
        if (options.underline) styles.push('text-decoration: underline');
        if (options.strike) styles.push('text-decoration: line-through');
        if (options.lineGap) styles.push(`line-height: ${1.6 + (options.lineGap / 10)}`);
        return styles.join('; ');
    }

    private loadTemplate(templateName: string): string {
        const dir =
            this.templatesDir ??
            (fs.existsSync(path.join(__dirname, 'templates'))
                ? path.join(__dirname, 'templates')
                : path.join(__dirname, '..', 'templates'));
        const filePath = path.join(dir, `${templateName}.hbs`);
        return fs.readFileSync(filePath, 'utf-8');
    }

}
