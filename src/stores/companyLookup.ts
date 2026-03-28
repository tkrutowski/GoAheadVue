import { defineStore } from "pinia";
import httpCommon from "@/config/http-common.ts";
import type { CompanyLookupResult } from "@/types/CompanyLookupResult.ts";

export const useCompanyLookupStore = defineStore("companyLookup", {
  state: () => ({
    loadingLookup: false,
  }),

  actions: {
    async lookupByNip(nip: string): Promise<CompanyLookupResult> {
      this.loadingLookup = true;
      try {
        const response = await httpCommon.get<CompanyLookupResult>(
          `/goahead/lookup?nip=${encodeURIComponent(nip)}`
        );
        return response.data;
      } finally {
        this.loadingLookup = false;
      }
    },
  },
});
