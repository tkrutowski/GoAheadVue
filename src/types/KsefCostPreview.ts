/** Wynik zadania KSeF — `total` = znalezione pozycje, `duplicates` = już w systemie. */
export type KsefCostPreviewFetchResult =
  | { ok: true; partial: boolean; total: number; duplicates: number }
  | { ok: false; message: string };
