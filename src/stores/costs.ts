import { defineStore } from "pinia";
import httpCommon from "@/config/http-common.ts";
import axios from "axios";
import moment from "moment";
import type { Cost } from "@/types/Cost.ts";
import type { PaymentStatus } from "@/types/Invoice.ts";

export const useCostStore = defineStore("cost", {
  state: () => ({
    rowsPerPage: parseInt(localStorage.getItem("rowsPerPageCost") || "20", 10),
    loadingCosts: false,
    loadingCostNumber: false,
    loadingFile: false,
    costs: [] as Cost[],
    totalCosts: 0,
    currentPage: 0,
    sortField: "sellDate",
    sortOrder: -1 as 1 | -1,
    filters: {} as any,
  }),

  getters: {
    getSortedCosts: (state) =>
      state.costs.slice().sort((a, b) => a.id - b.id),
  },

  actions: {
    async updateRowsPerPage(rows: number) {
      if (rows !== undefined) {
        this.rowsPerPage = rows;
        localStorage.setItem("rowsPerPageCost", rows.toString());
      }
    },

    async sortCosts(sortField: string, sortOrder: number) {
      this.sortField = sortField;
      this.sortOrder = (sortOrder === 1 ? 1 : -1) as 1 | -1;
      await this.getCostsFromDb(0);
    },

    async filterCosts(filters: any, rows?: number) {
      this.filters = filters;
      if (rows !== undefined) {
        await this.getCostsFromDb(0, rows);
      } else {
        await this.getCostsFromDb(0);
      }
    },

    async getCostsFromDb(page: number = 0, size?: number): Promise<void> {
      const pageSize = size || this.rowsPerPage;
      this.loadingCosts = true;

      const params = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
        sort: this.sortField,
        direction: this.sortOrder > 0 ? "ASC" : "DESC",
      });

      if (this.filters.global?.value) {
        params.append("globalFilter", this.filters.global.value);
      }

      if (this.filters.supplier?.value) {
        const supplier = this.filters.supplier.value;
        if (Array.isArray(supplier) && supplier.length > 0 && supplier[0].id) {
          params.append("idSeller", supplier[0].id.toString());
        } else if (!Array.isArray(supplier) && supplier.id) {
          params.append("idSeller", supplier.id.toString());
        }
      }

      if (this.filters.sellDate?.constraints?.[0]?.value) {
        const date = new Date(this.filters.sellDate.constraints[0].value);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        params.append("sellDate", `${year}-${month}-${day}`);

        const matchMode = this.filters.sellDate.constraints[0].matchMode;
        let dateComparisonType = "EQUALS";

        if (matchMode === "dateIs") {
          dateComparisonType = "EQUALS";
        } else if (matchMode === "dateBefore") {
          dateComparisonType = "BEFORE";
        } else if (matchMode === "dateAfter") {
          dateComparisonType = "AFTER";
        }

        params.append("dateComparisonType", dateComparisonType);
      }

      if (this.filters.amount?.constraints?.[0]?.value) {
        params.append("amount", this.filters.amount.constraints[0].value.toString());

        const matchMode = this.filters.amount.constraints[0].matchMode;
        let amountComparisonType = "EQUALS";

        if (matchMode === "equals") {
          amountComparisonType = "EQUALS";
        } else if (matchMode === "lt") {
          amountComparisonType = "LESS_THAN";
        } else if (matchMode === "lte") {
          amountComparisonType = "LESS_THAN_OR_EQUAL";
        } else if (matchMode === "gt") {
          amountComparisonType = "GREATER_THAN";
        } else if (matchMode === "gte") {
          amountComparisonType = "GREATER_THAN_OR_EQUAL";
        }

        params.append("amountComparisonType", amountComparisonType);
      }

      if (this.filters.paymentStatus?.value) {
        params.append("status", this.filters.paymentStatus.value);
      }

      const response = await httpCommon.get(`/goahead/cost/page?${params.toString()}`);
      const costs = response.data.content.map((cost: any) => this.convertResponse(cost));

      this.costs = costs;
      this.totalCosts = response.data.totalElements;
      this.currentPage = response.data.number;
      this.loadingCosts = false;
    },

    async getCostFromDb(costId: number): Promise<Cost | undefined> {
      this.loadingCosts = true;
      const response = await httpCommon.get(`/goahead/cost/${costId}`);
      this.loadingCosts = false;
      return this.convertResponse(response.data);
    },

    async addCostDb(cost: Cost, options?: { skipListRefresh?: boolean }) {
      console.log("START - addCostDb()");
      const payload = {
        ...cost,
        sellDate: cost.sellDate ? moment(cost.sellDate).format("YYYY-MM-DD") : null,
        invoiceDate: cost.invoiceDate ? moment(cost.invoiceDate).format("YYYY-MM-DD") : null,
        paymentDate: cost.paymentDate ? moment(cost.paymentDate).format("YYYY-MM-DD") : null,
      };
      await httpCommon.post(`/goahead/cost`, payload);
      if (!options?.skipListRefresh) {
        await this.getCostsFromDb(this.currentPage);
      }
    },

    async updateCostDb(cost: Cost) {
      const payload = {
        ...cost,
        sellDate: cost.sellDate ? moment(cost.sellDate).format("YYYY-MM-DD") : null,
        invoiceDate: cost.invoiceDate ? moment(cost.invoiceDate).format("YYYY-MM-DD") : null,
        paymentDate: cost.paymentDate ? moment(cost.paymentDate).format("YYYY-MM-DD") : null,
      };
      await httpCommon.put(`/goahead/cost`, payload);
      await this.getCostsFromDb(this.currentPage);
    },

    async deleteCostDb(costId: number) {
      await httpCommon.delete(`/goahead/cost/${costId}`);
      if (this.costs.length === 1 && this.currentPage > 0) {
        await this.getCostsFromDb(this.currentPage - 1);
      } else {
        await this.getCostsFromDb(this.currentPage);
      }
    },

    /**
     * Usuwa wiele kosztów; jedno odświeżenie listy na końcu.
     */
    async deleteCostsDb(costIds: number[]) {
      if (!costIds?.length) return;
      const uniqueIds = [...new Set(costIds)];
      const idsOnPage = new Set(this.costs.map((c) => c.id));
      const deletingFromPage = uniqueIds.filter((id) => idsOnPage.has(id));
      const deletesAllVisible =
        this.costs.length > 0 && deletingFromPage.length === this.costs.length;

      for (const id of uniqueIds) {
        await httpCommon.delete(`/goahead/cost/${id}`);
      }

      if (deletesAllVisible && this.currentPage > 0) {
        await this.getCostsFromDb(this.currentPage - 1);
      } else {
        await this.getCostsFromDb(this.currentPage);
      }
    },

    async getPdfFromS3(url: string) {
      try {
        const response = await axios.get(url, {
          responseType: "blob",
        });
        return response;
      } catch (error) {
        console.error("Błąd podczas pobierania PDF z S3", error);
        throw error;
      }
    },

    /**
     * Lista nowych kosztów z KSeF w zakresie dat (backend: GET /goahead/cost/ksef/preview).
     */
    async fetchKsefNewCostsPreview(dateFrom: string, dateTo: string): Promise<Cost[]> {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const response = await httpCommon.get(
        `/goahead/cost/ksef?${params.toString()}`
      );
      const raw = Array.isArray(response.data)
        ? response.data
        : response.data?.content ?? response.data?.items ?? [];
      return (raw as any[]).map((c) => this.convertResponse(c));
    },

    async updateCostStatusDb(costId: number, status: PaymentStatus) {
      await httpCommon.put(`/goahead/cost/paymentstatus/${costId}`, { value: status });
      const cost = this.costs.find((c) => c.id === costId);
      if (cost) {
        cost.paymentStatus = status;
      }
      await this.getCostsFromDb(this.currentPage);
    },

    /**
     * Sprawdza po API stronicowanym, czy istnieją koszty dla danego dostawcy (id sprzedawcy).
     */
    async supplierHasCosts(supplierId: number): Promise<boolean> {
      const params = new URLSearchParams({
        page: "0",
        size: "1",
        sort: this.sortField,
        direction: this.sortOrder > 0 ? "ASC" : "DESC",
      });
      params.append("idSeller", supplierId.toString());
      const response = await httpCommon.get(
        `/goahead/cost/page?${params.toString()}`
      );
      return (response.data.totalElements as number) > 0;
    },

    convertResponse(cost: any): Cost {
      return {
        ...cost,
        number: cost.number ?? cost.costNumber ?? "",
        supplier: cost.supplier ?? cost.seller ?? null,
        sellDate: cost.sellDate ? new Date(cost.sellDate) : null,
        invoiceDate: cost.invoiceDate ? new Date(cost.invoiceDate) : null,
        paymentDate: cost.paymentDate ? new Date(cost.paymentDate) : null,
      };
    },
  },
});

