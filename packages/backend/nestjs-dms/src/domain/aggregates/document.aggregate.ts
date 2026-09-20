import { randomUUID } from 'crypto';
import { AggregateRoot, BusinessError } from '@ssdev-toolkit/nestjs-core';
import { FileMetadata } from '../value-objects/file-metadata.vo';
import { DocumentMapping } from '../entities/document-mapping.entity';
import { DocumentVisibility } from '../enums/document-visibility.enum';
import { DocumentUploadedEvent, type DocumentUploadedSnapshot } from '../events/document-uploaded.event';
import { DocumentDeletedEvent, type DocumentDeletedSnapshot } from '../events/document-deleted.event';
import { DocumentRenamedEvent, type DocumentRenamedSnapshot } from '../events/document-renamed.event';

export class Document extends AggregateRoot<string> {
  #metadata: FileMetadata;
  #remotePath: string;
  #publicToken: string;
  #mappings: DocumentMapping[];
  #visibility: DocumentVisibility;
  #uploadedById?: string;
  #storageOwnerId?: string;
  #deletedAt?: Date;

  constructor(
    id: string,
    metadata: FileMetadata,
    remotePath: string,
    publicToken: string,
    mappings: DocumentMapping[],
    visibility: DocumentVisibility,
    uploadedById?: string,
    storageOwnerId?: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#metadata = metadata;
    this.#remotePath = remotePath;
    this.#publicToken = publicToken;
    this.#mappings = mappings;
    this.#visibility = visibility;
    this.#uploadedById = uploadedById;
    this.#storageOwnerId = storageOwnerId;
    this.#deletedAt = deletedAt;
  }

  static create(params: {
    fileName: string;
    contentType: string;
    fileSize: number;
    remotePath: string;
    publicToken: string;
    mappedTo: DocumentMapping[];
    visibility: DocumentVisibility;
    uploadedById?: string;
    storageOwnerId?: string;
  }): Document {
    const metadata = FileMetadata.of(params.fileName, params.contentType, params.fileSize);
    const document = new Document(
      randomUUID(),
      metadata,
      params.remotePath,
      params.publicToken,
      params.mappedTo,
      params.visibility,
      params.uploadedById,
      params.storageOwnerId,
    );
    document.addDomainEvent(new DocumentUploadedEvent(document.toSnapshot<DocumentUploadedSnapshot>()));
    return document;
  }

  rename(newName: string): void {
    if (!newName?.trim()) {
      throw new BusinessError('Document name must not be empty', 'DOCUMENT_NAME_INVALID');
    }
    if (this.#metadata.fileName === newName) return;

    const previousName = this.#metadata.fileName;
    this.#metadata = FileMetadata.of(
      newName,
      this.#metadata.contentType,
      this.#metadata.fileSize,
    );
    this.touch();
    this.addDomainEvent(new DocumentRenamedEvent(this.toSnapshot<DocumentRenamedSnapshot>(), previousName));
  }

  softDelete(): void {
    if (this.#deletedAt) return;
    this.#deletedAt = new Date();
    this.touch();
    this.addDomainEvent(new DocumentDeletedEvent(this.toSnapshot<DocumentDeletedSnapshot>()));
  }

  addMapping(mapping: DocumentMapping): void {
    this.#mappings.push(mapping);
  }

  get fileName(): string {
    return this.#metadata.fileName;
  }

  get contentType(): string {
    return this.#metadata.contentType;
  }

  get fileSize(): number {
    return this.#metadata.fileSize;
  }

  get metadata(): FileMetadata {
    return this.#metadata;
  }

  get remotePath(): string {
    return this.#remotePath;
  }

  get publicToken(): string {
    return this.#publicToken;
  }

  get visibility(): DocumentVisibility {
    return this.#visibility;
  }

  get isPublic(): boolean {
    return this.#visibility === DocumentVisibility.Public;
  }

  get uploadedById(): string | undefined {
    return this.#uploadedById;
  }

  get storageOwnerId(): string | undefined {
    return this.#storageOwnerId;
  }

  get mappings(): ReadonlyArray<DocumentMapping> {
    return this.#mappings;
  }

  get deletedAt(): Date | undefined {
    return this.#deletedAt;
  }

  get isDeleted(): boolean {
    return this.#deletedAt !== undefined;
  }
}
