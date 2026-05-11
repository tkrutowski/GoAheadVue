import type { KsefAsyncJobStatus } from '@/types/KsefJob';

/** Pozycja błędu z GET .../pdf/jobs/{jobId} (AsyncTaskError / elastyczny Jackson). */
export interface PdfBatchJobErrorItem {
  invoiceId?: number;
  costId?: number;
  message?: string;
}

/** Odpowiedź statusu zadania generowania PDF (jak AsyncTask po stronie backendu). */
export interface PdfBatchJobStatusResponse {
  status: KsefAsyncJobStatus;
  total?: number;
  processed?: number;
  message?: string;
  errors?: PdfBatchJobErrorItem[];
}
