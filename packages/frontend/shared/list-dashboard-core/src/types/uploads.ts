export interface ListFileUpload {
  file: File;
  detail: {
    base64Content: string;
    contentType: string;
    originalFileName: string;
  };
}
