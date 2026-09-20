import type { KsefFetchJobStatusResponse } from '@/types/KsefJob';

export interface KsefDialogResultError {
  /** Numer KSeF (lub numer faktury); brak przy nieoczekiwanym błędzie całego zadania. */
  label?: string;
  message: string;
}

export interface KsefDialogResult {
  severity: 'success' | 'warn' | 'error';
  message: string;
  errors: KsefDialogResultError[];
}

/**
 * Wynik zadania importu z KSeF (koszty / faktury) w postaci do pokazania w toaście i dialogu.
 * `message` pochodzi z backendu i jest pokazywany w całości.
 */
export function ksefJobToDialogResult(job: KsefFetchJobStatusResponse, what: 'kosztów' | 'faktur'): KsefDialogResult {
  const severity = job.status === 'SUCCEEDED' ? 'success' : job.status === 'PARTIAL' ? 'warn' : 'error';
  const message = job.message?.trim() || (job.status === 'FAILED' ? `Import ${what} z KSeF nie powiódł się.` : `Import ${what} z KSeF zakończony.`);
  const errors = (job.errors ?? []).map((e) => ({ label: e.entityId?.trim() || undefined, message: e.message }));
  return { severity, message, errors };
}
