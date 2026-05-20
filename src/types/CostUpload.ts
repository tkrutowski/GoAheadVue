import type { KsefAsyncJobStatus } from '@/types/KsefJob.ts';
import type { Cost } from '@/types/Cost.ts';

export interface CostUploadUrlRequest {
  fileName: string;
  contentType: string;
  module: 'GO_AHEAD' | 'AUTO';
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
}
