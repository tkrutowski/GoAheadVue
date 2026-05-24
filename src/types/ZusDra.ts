export type ZusDraAsyncJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface ZusDraJobStatusResponse {
  status: ZusDraAsyncJobStatus;
  message?: string;
}

export interface ZusDraDataDto {
  period: string;
  totalIncome: number;
  totalCosts: number;
}

export type ZusDraFetchResult =
  | { ok: true; data: ZusDraDataDto }
  | { ok: false; message: string };

export const ZUS_DRA_JOB_TERMINAL_STATUSES: ReadonlySet<ZusDraAsyncJobStatus> = new Set([
  'SUCCEEDED',
  'FAILED',
]);
