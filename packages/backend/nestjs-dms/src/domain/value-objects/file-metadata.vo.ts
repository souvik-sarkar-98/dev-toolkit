import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class FileMetadata {
  private constructor(
    readonly fileName: string,
    readonly contentType: string,
    readonly fileSize: number,
  ) { }

  static of(fileName: string, contentType: string, fileSize: number): FileMetadata {
    if (!fileName?.trim()) {
      throw new BusinessError('File name must not be empty', 'FILE_METADATA_INVALID');
    }
    if (!contentType?.trim()) {
      throw new BusinessError('Content type must not be empty', 'FILE_METADATA_INVALID');
    }
    if (fileSize <= 0) {
      throw new BusinessError('File size must be greater than zero', 'FILE_METADATA_INVALID');
    }
    return new FileMetadata(fileName, contentType, fileSize);
  }

  equals(other: FileMetadata): boolean {
    return (
      this.fileName === other.fileName &&
      this.contentType === other.contentType &&
      this.fileSize === other.fileSize
    );
  }
}
