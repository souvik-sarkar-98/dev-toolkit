/**
 * Common interfaces for all document generators
 */

export interface IDocumentMetadata {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    createdAt?: Date;
}

export interface IMargins {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface IDocumentOptions {
    metadata?: IDocumentMetadata;
    margins?: Partial<IMargins>;
}
