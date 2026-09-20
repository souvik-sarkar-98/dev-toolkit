import PDFDocument from 'pdfkit';
import {
    IPdfBuilder,
    IPdfSectionBuilder,
    IPdfDocumentOptions,
    IPdfTextOptions,
    IPdfImageOptions,
    IPdfTableOptions,
    IPdfTableColumn,
    IPdfSectionContent,
    PdfPageSize,
} from '../interfaces/pdf-generator.interface';

/**
 * PDF Section Builder - Fluent API for building PDF sections
 */
class PdfSectionBuilder implements IPdfSectionBuilder {
    private contents: IPdfSectionContent[] = [];

    constructor(
        private readonly parentBuilder: PdfBuilderService,
        private readonly sectionTitle?: string,
    ) { }

    addHeading(text: string, level: 1 | 2 | 3 | 4 = 1, options?: IPdfTextOptions): IPdfSectionBuilder {
        const fontSizes = { 1: 24, 2: 20, 3: 16, 4: 14 };
        this.contents.push({
            type: 'heading',
            data: text,
            options: {
                ...options,
                size: options?.size || fontSizes[level],
                style: options?.style || 'bold',
            },
        });
        return this;
    }

    addParagraph(text: string, options?: IPdfTextOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'paragraph',
            data: text,
            options: {
                ...options,
                paragraphGap: options?.paragraphGap || 10,
            },
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
        this.contents.push({
            type: 'image',
            data: source,
            options,
        });
        return this;
    }

    addTable(data: any[][], options?: IPdfTableOptions): IPdfSectionBuilder {
        this.contents.push({
            type: 'table',
            data,
            options,
        });
        return this;
    }

    addList(items: string[], options?: { ordered?: boolean; bulletChar?: string; indent?: number }): IPdfSectionBuilder {
        this.contents.push({
            type: 'list',
            data: items,
            options: {
                ordered: options?.ordered || false,
                bulletChar: options?.bulletChar || '•',
                indent: options?.indent || 20,
            },
        });
        return this;
    }

    addDivider(options?: { color?: string; thickness?: number }): IPdfSectionBuilder {
        this.contents.push({
            type: 'divider',
            data: null,
            options: {
                color: options?.color || '#cccccc',
                thickness: options?.thickness || 1,
            },
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

    addSignatureSection(options?: { label?: string; dateLabel?: string; space?: number }): IPdfSectionBuilder {
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

    getContents(): IPdfSectionContent[] {
        return this.contents;
    }
}

/**
 * PDF Builder Service - Main service for building PDF documents with a fluent API
 * Now includes support for watermarks, headers, and footers
 * 
 * @example
 * ```typescript
 * const pdf = await pdfBuilder
 *   .setOptions({
 *     pageSize: 'A4',
 *     orientation: 'portrait',
 *     watermark: {
 *       text: 'NABARUN NGO',
 *       opacity: 0.1,
 *       angle: -45
 *     },
 *     header: {
 *       title: 'Disclaimer',
 *       subtitle: 'NABARUN NGO\nWorking Together for a Better Tomorrow',
 *       date: '09-JAN-2026'
 *     }
 *   })
 *   .addSection('Introduction')
 *     .addHeading('Welcome to Our Report', 1)
 *     .addParagraph('This is an introductory paragraph...')
 *   .endSection()
 *   .build();
 * ```
 */
export class PdfBuilderService implements IPdfBuilder {
    private options: IPdfDocumentOptions = {};
    private sections: { title?: string; contents: IPdfSectionContent[] }[] = [];
    private pageBreaks: number[] = [];
    private currentPage: number = 1;
    private totalPages: number = 0;

    private static readonly PAGE_SIZES: Record<PdfPageSize, [number, number]> = {
        'A4': [595.28, 841.89],
        'A3': [841.89, 1190.55],
        'LETTER': [612, 792],
        'LEGAL': [612, 1008],
        'TABLOID': [792, 1224],
    };

    private static readonly DEFAULT_MARGINS = {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
    };

    setOptions(options: IPdfDocumentOptions): IPdfBuilder {
        this.options = { ...this.options, ...options };
        return this;
    }

    setTemplate(templateName: string, data: any): IPdfBuilder {
        console.warn('setTemplate is not natively supported by PDFKit engine. Use Puppeteer engine for HTML templates.');
        return this;
    }

    addSection(title?: string): IPdfSectionBuilder {
        return new PdfSectionBuilder(this, title);
    }

    addPageBreak(): IPdfBuilder {
        this.pageBreaks.push(this.sections.length);
        return this;
    }

    registerSection(section: { title?: string; contents: IPdfSectionContent[] }): void {
        this.sections.push(section);
    }

    async build(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const doc = this.createDocument();

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            this.renderDocument(doc);
            doc.end();
        });
    }

    buildStream(): NodeJS.ReadableStream {
        const doc = this.createDocument();
        this.renderDocument(doc);
        doc.end();
        return doc;
    }

    private createDocument(): PDFKit.PDFDocument {
        const pageSize = this.options.pageSize || 'A4';
        const orientation = this.options.orientation || 'portrait';
        const margins = { ...PdfBuilderService.DEFAULT_MARGINS, ...this.options.margins };

        // Adjust top margin if header is present
        if (this.options.header) {
            // Calculate dynamic margin based on whether centered logo exists
            const hasLogo = !!this.options.header.logoCentered;
            const logoHeight = this.options.header.logoHeight || 80;
            // Provide more breathing room for headers
            margins.top = hasLogo ? 140 + logoHeight : 130;
        }

        // Adjust bottom margin if footer is present
        if (this.options.footer) {
            margins.bottom = 80;
        }

        let size = PdfBuilderService.PAGE_SIZES[pageSize];
        if (orientation === 'landscape') {
            size = [size[1], size[0]];
        }

        const info: PDFKit.PDFDocumentOptions['info'] = {
            CreationDate: new Date(),
        };
        if (this.options.metadata?.title) info.Title = this.options.metadata.title;
        if (this.options.metadata?.author) info.Author = this.options.metadata.author;
        if (this.options.metadata?.subject) info.Subject = this.options.metadata.subject;
        if (this.options.metadata?.keywords?.length) info.Keywords = this.options.metadata.keywords.join(', ');
        if (this.options.metadata?.createdAt) info.CreationDate = this.options.metadata.createdAt;

        const doc = new PDFDocument({
            size,
            margins,
            compress: this.options.compress ?? true,
            autoFirstPage: this.options.autoFirstPage ?? true,
            info,
            bufferPages: true, // Enable buffering for page count
        });

        // Register custom fonts
        if (this.options.customFonts) {
            this.options.customFonts.forEach(font => {
                try {
                    doc.registerFont(font.name, font.path);
                } catch (e) {
                    console.error(`Error registering custom font ${font.name}:`, e);
                }
            });
        }

        return doc;
    }

    private renderDocument(doc: PDFKit.PDFDocument): void {
        // First pass: render all content to calculate total pages
        this.currentPage = 1;

        // Add header to first page if configured
        if (this.options.header) {
            this.renderHeader(doc);
        }

        // Add watermark to first page if configured
        if (this.options.watermark) {
            this.renderWatermark(doc);
        }

        // Add border to first page if configured
        if (this.options.showBorder) {
            this.renderBorder(doc);
        }

        // Render all sections
        this.sections.forEach((section, sectionIndex) => {
            if (this.pageBreaks.includes(sectionIndex) && sectionIndex > 0) {
                doc.addPage();
                this.currentPage++;
                if (this.options.header) this.renderHeader(doc);
                if (this.options.watermark) this.renderWatermark(doc);
                if (this.options.showBorder) this.renderBorder(doc);
            }

            if (section.title) {
                this.renderHeading(doc, section.title, { size: 18, style: 'bold' });
                doc.moveDown(0.5);
            }

            section.contents.forEach((content) => {
                this.renderContent(doc, content);
            });

            if (sectionIndex < this.sections.length - 1) {
                doc.moveDown(1);
            }
        });

        // Get total page count
        this.totalPages = (doc as any).bufferedPageRange().count;

        // Second pass: add footers with page numbers
        if (this.options.footer) {
            const range = (doc as any).bufferedPageRange();
            for (let i = 0; i < range.count; i++) {
                doc.switchToPage(i);
                this.renderFooter(doc, i + 1);
            }
        }
    }

    private renderHeader(doc: PDFKit.PDFDocument): void {
        const header = this.options.header!;
        const pageWidth = doc.page.width;
        const margins = doc.page.margins;
        const contentWidth = pageWidth - margins.left - margins.right;
        let startY = 40;

        // Save current state
        doc.save();

        // Accent bar on the left
        if (this.options.accentColor) {
            doc.rect(0, 0, 5, doc.page.height)
                .fill(this.options.accentColor);
        }

        // Background color if specified
        if (header.backgroundColor) {
            doc.rect(0, 0, pageWidth, 110)
                .fill(header.backgroundColor);
        }

        // Set text color
        const textColor = header.textColor || '#000000';
        doc.fillColor(textColor);

        // Centered logo at the top
        if (header.logoCentered) {
            try {
                const logoWidth = header.logoWidth || 100;
                const logoHeight = header.logoHeight || 80;
                const logoX = (pageWidth - logoWidth) / 2;

                doc.image(header.logoCentered, logoX, startY, {
                    width: logoWidth,
                    height: logoHeight
                });

                // Adjust startY to position title below logo
                startY = startY + logoHeight + 15;
            } catch (e) {
                console.error('Error loading centered logo:', e);
            }
        }

        // Left logo
        if (header.logoLeft) {
            try {
                doc.image(header.logoLeft, 40, startY, { width: 50, height: 50 });
            } catch (e) {
                console.error('Error loading left logo:', e);
            }
        }

        // Center title and subtitle
        if (header.title) {
            doc.font('Helvetica-Bold')
                .fontSize(22)
                .text(header.title, margins.left, startY, {
                    width: contentWidth,
                    align: 'center'
                });
        }

        if (header.subtitle) {
            doc.font('Helvetica')
                .fontSize(11)
                .text(header.subtitle, margins.left, startY + 28, {
                    width: contentWidth,
                    align: 'center',
                    lineGap: 3
                });
        }

        // Date
        if (header.date) {
            doc.font('Helvetica')
                .fontSize(9)
                .fillColor('#666666')
                .text(header.date, margins.left, startY + 70, {
                    width: contentWidth,
                    align: 'center'
                });
        }

        // Right logo
        if (header.logoRight) {
            try {
                doc.image(header.logoRight, pageWidth - 90, startY, { width: 50, height: 50 });
            } catch (e) {
                console.error('Error loading right logo:', e);
            }
        }

        // Calculate divider position based on whether centered logo exists
        const dividerY = header.logoCentered ? startY + 75 : 105;

        // Divider line
        doc.strokeColor('#dddddd')
            .lineWidth(0.5)
            .moveTo(margins.left, dividerY)
            .lineTo(pageWidth - margins.right, dividerY)
            .stroke();

        // Restore state
        doc.restore();
    }

    private renderFooter(doc: PDFKit.PDFDocument, pageNum: number): void {
        const footer = this.options.footer!;
        const pageHeight = doc.page.height;
        const pageWidth = doc.page.width;
        const margins = doc.page.margins;
        const contentWidth = pageWidth - margins.left - margins.right;
        const footerY = pageHeight - 40;

        doc.save();

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor('#666666');

        // Footer text
        if (footer.text) {
            const align = footer.alignment || 'left';
            const x = align === 'center' ? 0 : (align === 'right' ? pageWidth - 100 : 50);
            doc.text(footer.text, x, footerY, {
                width: align === 'center' ? pageWidth : 200,
                align: align
            });
        }

        // Page numbers
        if (footer.pageNumbers) {
            const pageText = `Page ${pageNum} of ${this.totalPages}`;
            doc.text(pageText, margins.left, footerY, {
                width: contentWidth,
                align: 'right'
            });
        }

        doc.restore();
    }

    private renderWatermark(doc: PDFKit.PDFDocument): void {
        const watermark = this.options.watermark!;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        doc.save();

        if (watermark.image) {
            // Image watermark
            try {
                const opacity = watermark.opacity || 0.1;
                doc.opacity(opacity);

                const imgWidth = pageWidth * 0.6;
                const imgHeight = pageHeight * 0.6;
                const x = (pageWidth - imgWidth) / 2;
                const y = (pageHeight - imgHeight) / 2;

                doc.image(watermark.image, x, y, {
                    width: imgWidth,
                    height: imgHeight,
                    align: 'center',
                    valign: 'center'
                });
            } catch (e) {
                console.error('Error loading watermark image:', e);
            }
        } else if (watermark.text) {
            // Text watermark
            const opacity = watermark.opacity || 0.1;
            const fontSize = watermark.fontSize || 60;
            const color = watermark.color || '#000000';
            const angle = watermark.angle || -45;
            const position = watermark.position || 'diagonal';

            doc.opacity(opacity);
            doc.fillColor(color);
            doc.font('Helvetica-Bold').fontSize(fontSize);

            if (position === 'center') {
                doc.text(watermark.text, 0, pageHeight / 2 - fontSize / 2, {
                    width: pageWidth,
                    align: 'center'
                });
            } else {
                // Diagonal watermark
                doc.rotate(angle, { origin: [pageWidth / 2, pageHeight / 2] });
                doc.text(watermark.text, 0, pageHeight / 2 - fontSize / 2, {
                    width: pageWidth,
                    align: 'center'
                });
            }
        }

        doc.restore();
    }

    private renderContent(doc: PDFKit.PDFDocument, content: IPdfSectionContent): void {
        switch (content.type) {
            case 'heading':
                this.renderHeading(doc, content.data, content.options);
                break;
            case 'paragraph':
                this.renderParagraph(doc, content.data, content.options);
                break;
            case 'text':
                this.renderText(doc, content.data, content.options);
                break;
            case 'image':
                this.renderImage(doc, content.data, content.options);
                break;
            case 'table':
                this.renderTable(doc, content.data, content.options);
                break;
            case 'list':
                this.renderList(doc, content.data, content.options);
                break;
            case 'divider':
                this.renderDivider(doc, content.options);
                break;
            case 'space':
                doc.moveDown(content.data / 12);
                break;
            case 'pageBreak':
                doc.addPage();
                this.currentPage++;
                if (this.options.header) this.renderHeader(doc);
                if (this.options.watermark) this.renderWatermark(doc);
                if (this.options.showBorder) this.renderBorder(doc);
                break;
            case 'signature':
                this.renderSignature(doc, content.options);
                break;
        }
    }

    private renderHeading(doc: PDFKit.PDFDocument, text: string, options?: IPdfTextOptions): void {
        this.applyFontOptions(doc, options);
        doc.text(text, {
            align: options?.align || 'left',
            underline: options?.underline,
            strike: options?.strike,
            link: options?.link,
        });
        doc.moveDown(0.5);
    }

    private renderParagraph(doc: PDFKit.PDFDocument, text: string, options?: IPdfTextOptions): void {
        this.applyFontOptions(doc, { ...options, style: options?.style || 'normal' });
        doc.text(text, {
            align: options?.align || 'justify',
            lineGap: options?.lineGap || 2,
            paragraphGap: options?.paragraphGap || 10,
            indent: options?.indent,
            columns: options?.columns,
            columnGap: options?.columnGap,
        });
    }

    private renderText(doc: PDFKit.PDFDocument, text: any, options?: IPdfTextOptions & { isTOC?: boolean }): void {
        this.applyFontOptions(doc, options);

        if (options?.isTOC && typeof text === 'object') {
            const { title, page } = text;
            const margins = doc.page.margins;
            const pageWidth = doc.page.width - margins.left - margins.right;
            const pageStr = page.toString();
            const y = doc.y;

            // 1. Draw Title
            doc.text(title, margins.left, y);

            // 2. Draw Page Number (Right Aligned)
            const pageNumWidth = doc.widthOfString(pageStr);
            const pageNumX = doc.page.width - margins.right - pageNumWidth;
            doc.text(pageStr, pageNumX, y);

            // 3. Render Dots in Between
            const titleWidth = doc.widthOfString(title);
            const startDots = margins.left + titleWidth + 8;
            const endDots = pageNumX - 8;

            if (endDots > startDots) {
                const dot = '.';
                const dotW = doc.widthOfString(dot);
                const dotsCount = Math.floor((endDots - startDots) / dotW);
                doc.text(dot.repeat(dotsCount), startDots, y, { lineBreak: false });
            }

            // Reset to next line correctly
            doc.y = y + doc.currentLineHeight() + 2;
        } else {
            doc.text(text.toString(), {
                align: options?.align || 'left',
                continued: false,
                underline: options?.underline,
                strike: options?.strike,
                link: options?.link,
            });
        }
    }

    private renderImage(doc: PDFKit.PDFDocument, source: string | Buffer, options?: IPdfImageOptions): void {
        const imageOptions: PDFKit.Mixins.ImageOption = {};

        if (options?.width) imageOptions.width = options.width;
        if (options?.height) imageOptions.height = options.height;
        if (options?.fit) imageOptions.fit = options.fit;
        if (options?.align && options.align !== 'left') {
            imageOptions.align = options.align as 'center' | 'right';
        }
        if (options?.valign && options.valign !== 'top') {
            imageOptions.valign = options.valign as 'center' | 'bottom';
        }

        doc.image(source, imageOptions);
        doc.moveDown(0.5);
    }

    private renderTable(doc: PDFKit.PDFDocument, data: any[][], options?: IPdfTableOptions): void {
        if (!data || data.length === 0) return;

        const startX = doc.page.margins.left;
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const cellPadding = options?.cellPadding || 5;
        const borderWidth = options?.borderWidth || 0.5;
        const borderColor = options?.borderColor || '#000000';

        const columns: IPdfTableColumn[] = options?.columns || data[0].map((_, i) => ({ header: `Column ${i + 1}` }));
        const numColumns = columns.length;
        const columnWidths = this.calculateColumnWidths(columns, pageWidth, numColumns);

        let currentY = doc.y;

        // Draw header row
        if (columns.length > 0) {
            const headerHeight = this.calculateRowHeight(doc, columns.map(c => c.header), columnWidths, cellPadding, options?.headerFontSize || 10);

            if (options?.headerBackground) {
                doc.rect(startX, currentY, pageWidth, headerHeight)
                    .fill(options.headerBackground);
            }

            doc.fillColor(options?.headerTextColor || '#000000');
            doc.font('Helvetica-Bold').fontSize(options?.headerFontSize || 10);

            let cellX = startX;
            columns.forEach((column, i) => {
                doc.text(column.header, cellX + cellPadding, currentY + cellPadding, {
                    width: columnWidths[i] - cellPadding * 2,
                    align: column.align || 'left',
                });
                cellX += columnWidths[i];
            });

            doc.strokeColor(borderColor).lineWidth(borderWidth);
            doc.rect(startX, currentY, pageWidth, headerHeight).stroke();

            currentY += headerHeight;
        }

        // Draw data rows
        doc.font('Helvetica').fontSize(options?.rowFontSize || 10);
        doc.fillColor('#000000');

        data.forEach((row, rowIndex) => {
            const rowHeight = this.calculateRowHeight(doc, row, columnWidths, cellPadding, options?.rowFontSize || 10);

            // Check for page break
            if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                this.currentPage++;
                if (this.options.header) this.renderHeader(doc);
                if (this.options.watermark) this.renderWatermark(doc);
                currentY = doc.page.margins.top;
            }

            if (options?.alternateRowColor && rowIndex % 2 === 1) {
                doc.rect(startX, currentY, pageWidth, rowHeight)
                    .fill(options.alternateRowColor);
                doc.fillColor('#000000');
            }

            let cellX = startX;
            row.forEach((cell, cellIndex) => {
                const cellValue = cell?.toString() || '';
                const column = columns[cellIndex];
                doc.text(cellValue, cellX + cellPadding, currentY + cellPadding, {
                    width: columnWidths[cellIndex] - cellPadding * 2,
                    align: column?.align || 'left',
                });
                cellX += columnWidths[cellIndex];
            });

            doc.strokeColor(borderColor).lineWidth(borderWidth);
            doc.rect(startX, currentY, pageWidth, rowHeight).stroke();

            currentY += rowHeight;
        });

        doc.y = currentY;
        doc.moveDown(0.5);
    }

    private calculateColumnWidths(columns: any[], pageWidth: number, numColumns: number): number[] {
        const widths: number[] = [];
        let totalFixed = 0;
        let autoCount = 0;

        columns.forEach((col) => {
            if (typeof col.width === 'number') {
                widths.push(col.width);
                totalFixed += col.width;
            } else {
                widths.push(0);
                autoCount++;
            }
        });

        const remainingWidth = pageWidth - totalFixed;
        const autoWidth = autoCount > 0 ? remainingWidth / autoCount : 0;

        return widths.map((w, i) => w === 0 ? autoWidth : w);
    }

    private calculateRowHeight(doc: PDFKit.PDFDocument, row: any[], columnWidths: number[], cellPadding: number, fontSize: number): number {
        let maxHeight = fontSize + cellPadding * 2;

        row.forEach((cell, i) => {
            const cellValue = cell?.toString() || '';
            const textHeight = doc.heightOfString(cellValue, {
                width: columnWidths[i] - cellPadding * 2,
            });
            maxHeight = Math.max(maxHeight, textHeight + cellPadding * 2);
        });

        return maxHeight;
    }

    private renderList(doc: PDFKit.PDFDocument, items: string[], options: { ordered?: boolean; bulletChar?: string; indent?: number }): void {
        const indent = options.indent || 20;
        const bulletChar = options.bulletChar || '•';

        items.forEach((item, index) => {
            const prefix = options.ordered ? `${index + 1}. ` : `${bulletChar} `;
            doc.text(prefix + item, doc.page.margins.left + indent, doc.y, {
                width: doc.page.width - doc.page.margins.left - doc.page.margins.right - indent,
            });
        });

        doc.moveDown(0.5);
    }

    private renderDivider(doc: PDFKit.PDFDocument, options: { color?: string; thickness?: number }): void {
        const startX = doc.page.margins.left;
        const endX = doc.page.width - doc.page.margins.right;
        const y = doc.y + 10;

        doc.strokeColor(options.color || '#cccccc')
            .lineWidth(options.thickness || 1)
            .moveTo(startX, y)
            .lineTo(endX, y)
            .stroke();

        doc.y = y + 10;
    }

    private renderBorder(doc: PDFKit.PDFDocument): void {
        const borderOptions = this.options.borderOptions || {};
        const color = borderOptions.color || '#2B5FA6';
        const thickness = borderOptions.thickness || 1;
        const padding = borderOptions.padding || 30;

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        doc.save();
        doc.strokeColor(color)
            .lineWidth(thickness)
            .rect(padding, padding, pageWidth - padding * 2, pageHeight - padding * 2)
            .stroke();
        doc.restore();
    }

    private renderSignature(doc: PDFKit.PDFDocument, options?: { label?: string; dateLabel?: string; space?: number }): void {
        const label = options?.label || 'Authorized Signature';
        const dateLabel = options?.dateLabel || 'Date';
        const space = options?.space || 60;
        const lineLength = 200;

        doc.moveDown(2);
        const startY = doc.y;
        const margins = doc.page.margins;
        const pageWidth = doc.page.width;

        doc.save();
        doc.strokeColor('#333333').lineWidth(0.8);

        // Left Line
        doc.moveTo(margins.left, startY + space)
            .lineTo(margins.left + lineLength, startY + space)
            .stroke();

        doc.fontSize(9).fillColor('#333333');
        doc.text(label, margins.left, startY + space + 8, {
            width: lineLength,
            align: 'center'
        });

        // Right Line
        const rightX = pageWidth - margins.right - lineLength;
        doc.moveTo(rightX, startY + space)
            .lineTo(pageWidth - margins.right, startY + space)
            .stroke();

        doc.text(dateLabel, rightX, startY + space + 8, {
            width: lineLength,
            align: 'center'
        });

        doc.restore();
        doc.moveDown(4);
    }

    private applyFontOptions(doc: PDFKit.PDFDocument, options?: IPdfTextOptions): void {
        const fontFamily = options?.family || this.options.fontFamily || 'Helvetica';
        const fontSize = options?.size || 12;
        const fontStyle = options?.style || 'normal';

        // Check if the requested font is a custom registered one
        const isCustom = this.options.customFonts?.some(f => f.name === fontFamily);

        if (isCustom) {
            doc.font(fontFamily);
        } else {
            const fontMap: Record<string, string> = {
                'normal': fontFamily,
                'bold': `${fontFamily}-Bold`,
                'italic': `${fontFamily}-Oblique`,
                'bolditalic': `${fontFamily}-BoldOblique`,
            };

            try {
                doc.font(fontMap[fontStyle] || fontFamily);
            } catch {
                doc.font(fontFamily);
            }
        }

        doc.fontSize(fontSize);

        if (options?.color) {
            doc.fillColor(options.color);
        } else {
            doc.fillColor('#000000');
        }
    }

    reset(): PdfBuilderService {
        this.options = {};
        this.sections = [];
        this.pageBreaks = [];
        this.currentPage = 1;
        this.totalPages = 0;
        return this;
    }
}