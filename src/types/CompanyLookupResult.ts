/** Odpowiedź z GET /goahead/company/lookup — zgodna z DTO po stronie Javy */
export interface CompanyLookupResult {
  name: string;
  nip: string;
  regon: string | null;
  street: string;
  zip: string;
  city: string;
}
