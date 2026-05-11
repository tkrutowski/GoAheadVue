/** Wynik zadania KSeF — pole `total` z AsyncTask (liczba nowych kosztów). */
export type KsefCostPreviewFetchResult =
  | { ok: true; partial: boolean; total: number }
  | { ok: false; message: string };
