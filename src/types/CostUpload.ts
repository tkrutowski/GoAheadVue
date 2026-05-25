import type { KsefAsyncJobStatus } from '@/types/KsefJob.ts';
import type { Cost } from '@/types/Cost.ts';
import type { Supplier } from '@/types/Supplier.ts';

export interface CostUploadUrlRequest {
  fileName: string;
  contentType: string;
  module: 'GO_AHEAD' | 'GO_AHEAD_COST' | 'GO_AHEAD_INVOICE' | 'GO_AHEAD_SUPPLIER';
}

export interface CostUploadUrlResponse {
  uploadUrl: string;
  objectKey?: string;
  jobId?: string | number;
}

export interface CostUploadCompleteRequest {
  objectKey: string;
  jobId?: string | number;
}

export interface CostUploadJobStatusResponse {
  status: KsefAsyncJobStatus;
  message?: string;
  /** Zparsowany koszt do wypełnienia formularza */
  textractResultJson?: string;
}

export interface CostUploadResult {
  cost: Cost;
  partial: boolean;
  supplierMatched: boolean;
  /** Dane dostawcy z OCR do prefillu dialogu tworzenia (gdy brak dopasowania po NIP) */
  supplierDraft?: Partial<Supplier> | null;
}
