import type { KsefAsyncJobStatus } from '@/types/KsefJob';

/** Wartość query `jobType` — zgodna z KsefCostJobService.JOB_TYPE na backendzie. */
export const ASYNC_JOB_TYPE_KSEF_COST = 'KSEF_FETCH_COSTS';

/** GET /v1/async/latest — AsyncTaskStatusResponse (status + updatedAt). */
export interface AsyncTaskStatusResponse {
  status: KsefAsyncJobStatus;
  updatedAt?: string;
}

export function asyncTaskStatusTimestamp(data: AsyncTaskStatusResponse): string | null {
  const v = data.updatedAt;
  if (v != null && String(v).trim()) return String(v).trim();
  return null;
}
