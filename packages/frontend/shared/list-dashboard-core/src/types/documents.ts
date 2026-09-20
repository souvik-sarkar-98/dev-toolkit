export interface ListDocument {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  fileUrl?: string;
  isPublic: boolean;
  uploadedAt: string;
  generatedDoc: boolean;
}
