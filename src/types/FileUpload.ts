/** Odpowiedź POST /v1/files/{module} (FileStoreController). */
export interface FileInfo {
  id?: number;
  name?: string;
  url: string;
  type?: string;
  size?: number;
  uploadDate?: string;
  description?: string;
}
