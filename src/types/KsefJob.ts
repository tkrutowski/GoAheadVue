/** Wspólne stany zadań KSeF (faktury, podgląd kosztów) */
export type KsefAsyncJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL';

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

/** Błąd per pozycja przy imporcie z KSeF (`entityId` = numer KSeF lub numer faktury; null przy nieoczekiwanym błędzie całego zadania). */
export interface KsefFetchErrorItem {
  entityId?: string | null;
  message: string;
}

/**
 * Status zadania importu z KSeF — wspólny dla kosztów (GET /goahead/cost/ksef/jobs/{id})
 * i faktur sprzedażowych (GET /goahead/invoice/ksef/import/jobs/{id}).
 * `message` to gotowy tekst po polsku (pokazywać w całości).
 */
export interface KsefFetchJobStatusResponse {
  status: KsefAsyncJobStatus;
  /** Pozycje znalezione w KSeF. */
  total?: number;
  /** Nowo zaimportowane pozycje. */
  processed?: number;
  /** Pozycje, które już były w systemie. */
  duplicates?: number;
  message?: string;
  errors?: KsefFetchErrorItem[];
}

export const KSEF_ASYNC_JOB_TERMINAL_STATUSES: ReadonlySet<KsefAsyncJobStatus> = new Set(['SUCCEEDED', 'FAILED', 'PARTIAL']);

/** Zachowana nazwa dla istniejących importów — ta sama instancja zbioru */
export const KSEF_INVOICE_JOB_TERMINAL_STATUSES: ReadonlySet<KsefInvoiceJobApiStatus> = KSEF_ASYNC_JOB_TERMINAL_STATUSES;
