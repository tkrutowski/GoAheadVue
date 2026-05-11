/** Odczyt jobId z body odpowiedzi startu zadania KSeF (202 lub przejściowo 200). */
export function ksefStartResponseJobId(data: unknown): string | number | null {
  if (data && typeof data === 'object' && 'jobId' in data) {
    const v = (data as { jobId: unknown }).jobId;
    if (typeof v === 'string' || typeof v === 'number') return v;
  }
  return null;
}
