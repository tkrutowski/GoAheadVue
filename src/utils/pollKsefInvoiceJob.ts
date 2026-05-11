import type { AxiosInstance } from 'axios';
import {
  type KsefAsyncJobStatus,
  type KsefCostPreviewJobStatusResponse,
  type KsefInvoiceJobStatusResponse,
  KSEF_ASYNC_JOB_TERMINAL_STATUSES,
} from '@/types/KsefJob';
import type { PdfBatchJobStatusResponse } from '@/types/PdfBatchJob';

export interface PollKsefInvoiceJobOptions {
  /** Pierwszy i bazowy odstęp między zapytaniami (ms). Domyślnie 2000. */
  intervalMs?: number;
  /** Maksymalny odstęp po backoff (ms). Domyślnie 5000. */
  maxIntervalMs?: number;
  /** Maksymalny czas oczekiwania na status terminalny (ms). Domyślnie 15 min. */
  timeoutMs?: number;
}

/** Alias dla reużycia przy kosztach */
export type PollKsefJobOptions = PollKsefInvoiceJobOptions;

const INVOICE_JOBS_BASE = '/goahead/invoice/ksef/jobs';
const COST_KSEF_JOBS_BASE = '/goahead/cost/ksef/jobs';
const INVOICE_PDF_JOBS_BASE = '/goahead/invoice/pdf/jobs';
const COST_PDF_JOBS_BASE = '/goahead/cost/pdf/jobs';

async function pollKsefJobUntilTerminal<T extends { status: KsefAsyncJobStatus }>(
  http: AxiosInstance,
  jobId: string | number,
  jobsBasePath: string,
  options: PollKsefJobOptions | undefined,
  messages: { timeout: string; invalid: string }
): Promise<T> {
  const intervalMs = options?.intervalMs ?? 2000;
  const maxIntervalMs = options?.maxIntervalMs ?? 5000;
  const timeoutMs = options?.timeoutMs ?? 15 * 60 * 1000;
  const started = Date.now();
  let delay = intervalMs;
  const path = `${jobsBasePath.replace(/\/$/, '')}/${encodeURIComponent(String(jobId))}`;

  while (true) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(messages.timeout);
    }

    const { data } = await http.get<T>(path);

    if (!data || typeof data.status !== 'string') {
      throw new Error(messages.invalid);
    }

    if (KSEF_ASYNC_JOB_TERMINAL_STATUSES.has(data.status as KsefAsyncJobStatus)) {
      return data;
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 500, maxIntervalMs);
  }
}

/**
 * Poluje GET /goahead/invoice/ksef/jobs/{jobId} do statusu SUCCEEDED | FAILED | PARTIAL.
 */
export async function pollKsefInvoiceJobUntilTerminal(
  http: AxiosInstance,
  jobId: string | number,
  options?: PollKsefInvoiceJobOptions
): Promise<KsefInvoiceJobStatusResponse> {
  return pollKsefJobUntilTerminal<KsefInvoiceJobStatusResponse>(
    http,
    jobId,
    INVOICE_JOBS_BASE,
    options,
    {
      timeout:
        'Przekroczono czas oczekiwania na zakończenie wysyłki faktur do KSeF. Sprawdź listę faktur za chwilę.',
      invalid: 'Niepoprawna odpowiedź serwera przy sprawdzaniu statusu wysyłki KSeF.',
    }
  );
}

/**
 * Poluje GET /goahead/cost/ksef/jobs/{jobId} do statusu terminalnego.
 */
export async function pollKsefCostPreviewJobUntilTerminal(
  http: AxiosInstance,
  jobId: string | number,
  options?: PollKsefJobOptions
): Promise<KsefCostPreviewJobStatusResponse> {
  return pollKsefJobUntilTerminal<KsefCostPreviewJobStatusResponse>(
    http,
    jobId,
    COST_KSEF_JOBS_BASE,
    options,
    {
      timeout:
        'Przekroczono czas oczekiwania na pobranie kosztów z KSeF. Spróbuj ponownie za chwilę lub zawęź zakres dat.',
      invalid: 'Niepoprawna odpowiedź serwera przy sprawdzaniu statusu pobierania kosztów z KSeF.',
    }
  );
}

/**
 * Poluje GET /goahead/invoice/pdf/jobs/{jobId}.
 */
export async function pollInvoicePdfJobUntilTerminal(
  http: AxiosInstance,
  jobId: string | number,
  options?: PollKsefInvoiceJobOptions
): Promise<PdfBatchJobStatusResponse> {
  return pollKsefJobUntilTerminal<PdfBatchJobStatusResponse>(
    http,
    jobId,
    INVOICE_PDF_JOBS_BASE,
    options,
    {
      timeout:
        'Przekroczono czas oczekiwania na wygenerowanie PDF faktur. Sprawdź listę za chwilę lub spróbuj ponownie.',
      invalid: 'Niepoprawna odpowiedź serwera przy sprawdzaniu statusu generowania PDF faktur.',
    }
  );
}

/**
 * Poluje GET /goahead/cost/pdf/jobs/{jobId}.
 */
export async function pollCostPdfJobUntilTerminal(
  http: AxiosInstance,
  jobId: string | number,
  options?: PollKsefJobOptions
): Promise<PdfBatchJobStatusResponse> {
  return pollKsefJobUntilTerminal<PdfBatchJobStatusResponse>(
    http,
    jobId,
    COST_PDF_JOBS_BASE,
    options,
    {
      timeout:
        'Przekroczono czas oczekiwania na wygenerowanie PDF kosztów. Sprawdź listę za chwilę lub spróbuj ponownie.',
      invalid: 'Niepoprawna odpowiedź serwera przy sprawdzaniu statusu generowania PDF kosztów.',
    }
  );
}
