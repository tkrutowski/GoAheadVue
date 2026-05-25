/** Wspólne stany zadań KSeF (faktury, podgląd kosztów) */
export type KsefAsyncJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'PARTIAL';

/** Status zadania wysyłki faktur — alias dla czytelności przy endpointach faktur */
export type KsefInvoiceJobApiStatus = KsefAsyncJobStatus;

export interface KsefInvoiceJobStartResponse {
  jobId: string | number;
}

export interface KsefInvoiceJobErrorItem {
  invoiceId: number;
  message: string;
}

export interface KsefInvoiceJobStatusResponse {
  status: KsefInvoiceJobApiStatus;
  processed?: number;
  total?: number;
  message?: string;
  errors?: KsefInvoiceJobErrorItem[];
}

/** Błędy per pozycja przy podglądzie kosztów z KSeF (opcjonalny identyfikator kosztu) */
export interface KsefCostPreviewJobErrorItem {
  costId?: number;
  message: string;
}

export interface KsefCostPreviewJobStatusResponse {
  status: KsefAsyncJobStatus;
  processed?: number;
  duplicates?: number;
  total?: number;
  message?: string;
  errors?: KsefCostPreviewJobErrorItem[];
  /** Surowe rekordy kosztów jak z synchronicznego GET /goahead/cost/ksef */
  costs?: unknown[];
}

export const KSEF_ASYNC_JOB_TERMINAL_STATUSES: ReadonlySet<KsefAsyncJobStatus> = new Set([
  'SUCCEEDED',
  'FAILED',
  'PARTIAL',
]);

/** Zachowana nazwa dla istniejących importów — ta sama instancja zbioru */
export const KSEF_INVOICE_JOB_TERMINAL_STATUSES: ReadonlySet<KsefInvoiceJobApiStatus> =
  KSEF_ASYNC_JOB_TERMINAL_STATUSES;
