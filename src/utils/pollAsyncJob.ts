import type { AxiosInstance } from 'axios';
import {
  type KsefAsyncJobStatus,
  type KsefCostPreviewJobStatusResponse,
  type KsefInvoiceJobStatusResponse,
  KSEF_ASYNC_JOB_TERMINAL_STATUSES,
} from '@/types/KsefJob';
import type { CostUploadJobStatusResponse } from '@/types/CostUpload';
import type { PdfBatchJobStatusResponse } from '@/types/PdfBatchJob';
import {
  type ZusDraAsyncJobStatus,
  type ZusDraDataDto,
  type ZusDraJobStatusResponse,
  ZUS_DRA_JOB_TERMINAL_STATUSES,
} from '@/types/ZusDra';

export interface PollAsyncJobOptions {
  /** Pierwszy i bazowy odstęp między zapytaniami (ms). Domyślnie 2000. */
  intervalMs?: number;
  /** Maksymalny odstęp po backoff (ms). Domyślnie 5000. */
  maxIntervalMs?: number;
  /** Maksymalny czas oczekiwania na status terminalny (ms). Domyślnie 15 min. */
  timeoutMs?: number;
}

const INVOICE_JOBS_BASE = '/goahead/invoice/ksef/jobs';
const COST_KSEF_JOBS_BASE = '/goahead/cost/ksef/jobs';
const INVOICE_PDF_JOBS_BASE = '/goahead/invoice/pdf/jobs';
const COST_PDF_JOBS_BASE = '/goahead/cost/pdf/jobs';
const COST_UPLOAD_JOBS_BASE = '/goahead/cost/upload/jobs';
const ZUS_DRA_JOBS_BASE = '/goahead/invoice/zus-dra/jobs';

async function pollJobUntilTerminal<T extends { status: KsefAsyncJobStatus }>(
  http: AxiosInstance,
  jobId: string | number,
  jobsBasePath: string,
  options: PollAsyncJobOptions | undefined,
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
  options?: PollAsyncJobOptions
): Promise<KsefInvoiceJobStatusResponse> {
  return pollJobUntilTerminal<KsefInvoiceJobStatusResponse>(
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
  options?: PollAsyncJobOptions
): Promise<KsefCostPreviewJobStatusResponse> {
  return pollJobUntilTerminal<KsefCostPreviewJobStatusResponse>(
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
  options?: PollAsyncJobOptions
): Promise<PdfBatchJobStatusResponse> {
  return pollJobUntilTerminal<PdfBatchJobStatusResponse>(
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
  options?: PollAsyncJobOptions
): Promise<PdfBatchJobStatusResponse> {
  return pollJobUntilTerminal<PdfBatchJobStatusResponse>(
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

/**
 * Poluje GET /goahead/cost/upload/jobs/{jobId}.
 */
export async function pollCostUploadJobUntilTerminal(
  http: AxiosInstance,
  jobId: string | number,
  options?: PollAsyncJobOptions
): Promise<CostUploadJobStatusResponse> {
  return pollJobUntilTerminal<CostUploadJobStatusResponse>(
    http,
    jobId,
    COST_UPLOAD_JOBS_BASE,
    options,
    {
      timeout:
        'Przekroczono czas oczekiwania na odczyt danych z pliku. Spróbuj ponownie za chwilę.',
      invalid: 'Niepoprawna odpowiedź serwera przy sprawdzaniu statusu odczytu pliku kosztu.',
    }
  );
}

async function pollZusDraJobUntilTerminalInternal(
  http: AxiosInstance,
  jobId: string | number,
  options: PollAsyncJobOptions | undefined,
  messages: { timeout: string; invalid: string }
): Promise<ZusDraJobStatusResponse> {
  const intervalMs = options?.intervalMs ?? 2000;
  const maxIntervalMs = options?.maxIntervalMs ?? 5000;
  const timeoutMs = options?.timeoutMs ?? 15 * 60 * 1000;
  const started = Date.now();
  let delay = intervalMs;
  const path = `${ZUS_DRA_JOBS_BASE}/${encodeURIComponent(String(jobId))}`;

  while (true) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(messages.timeout);
    }

    const { data } = await http.get<ZusDraJobStatusResponse>(path);

    if (!data || typeof data.status !== 'string') {
      throw new Error(messages.invalid);
    }

    if (ZUS_DRA_JOB_TERMINAL_STATUSES.has(data.status as ZusDraAsyncJobStatus)) {
      return data;
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 500, maxIntervalMs);
  }
}

/**
 * Poluje GET /goahead/invoice/zus-dra/jobs/{jobId} do statusu SUCCEEDED | FAILED.
 */
export async function pollZusDraJobUntilTerminal(
  http: AxiosInstance,
  jobId: string | number,
  options?: PollAsyncJobOptions
): Promise<ZusDraJobStatusResponse> {
  return pollZusDraJobUntilTerminalInternal(http, jobId, options, {
    timeout:
      'Przekroczono czas oczekiwania na obliczenie ZUS DRA. Spróbuj ponownie za chwilę.',
    invalid: 'Niepoprawna odpowiedź serwera przy sprawdzaniu statusu obliczenia ZUS DRA.',
  });
}

function parseZusDraResultPayload(data: unknown): ZusDraDataDto {
  if (!data || typeof data !== 'object') {
    throw new Error('Niepoprawna odpowiedź serwera (wynik ZUS DRA).');
  }
  const raw = data as Record<string, unknown>;
  const period = typeof raw.period === 'string' ? raw.period : '';
  const totalIncome =
    typeof raw.totalIncome === 'number'
      ? raw.totalIncome
      : typeof raw.totalIncome === 'string'
        ? Number(raw.totalIncome)
        : 0;
  const totalCosts =
    typeof raw.totalCosts === 'number'
      ? raw.totalCosts
      : typeof raw.totalCosts === 'string'
        ? Number(raw.totalCosts)
        : 0;
  return {
    period,
    totalIncome: Number.isFinite(totalIncome) ? totalIncome : 0,
    totalCosts: Number.isFinite(totalCosts) ? totalCosts : 0,
  };
}

/**
 * Pobiera wynik GET /goahead/invoice/zus-dra/jobs/{jobId}/result (po statusie SUCCEEDED).
 */
export async function fetchZusDraJobResult(
  http: AxiosInstance,
  jobId: string | number
): Promise<ZusDraDataDto> {
  const path = `${ZUS_DRA_JOBS_BASE}/${encodeURIComponent(String(jobId))}/result`;
  const maxAttempts = 4;
  const retryDelayMs = 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await http.get<unknown>(path, {
      validateStatus: (status) => status === 200 || status === 204 || status === 404,
    });

    if (response.status === 404) {
      throw new Error('Zadanie obliczenia ZUS DRA nie istnieje.');
    }

    if (response.status === 200) {
      return parseZusDraResultPayload(response.data);
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  throw new Error('Wynik obliczenia ZUS DRA jest jeszcze niedostępny. Spróbuj ponownie za chwilę.');
}
