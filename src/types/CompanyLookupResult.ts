import type { Address } from "@/types/Customer.ts";

/** Odpowiedź z GET /goahead/company/lookup — zgodna z DTO po stronie Javy */
export interface CompanyLookupResult {
  name: string;
  nip: string;
  regon: string | null;
  address: Pick<Address, "street" | "zip" | "city">;
}
