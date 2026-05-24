import { defineStore } from 'pinia';
import httpCommon from '@/config/http-common.ts';
import axios from 'axios';
import moment from 'moment';
import type { Cost } from '@/types/Cost.ts';
import type { PaymentStatus } from '@/types/Invoice.ts';
import type { KsefCostPreviewFetchResult } from '@/types/KsefCostPreview.ts';
import type {
  CostUploadCompleteRequest,
  CostUploadResult,
  CostUploadUrlRequest,
  CostUploadUrlResponse,
} from '@/types/CostUpload.ts';
import type { Supplier } from '@/types/Supplier.ts';
import { pollCostPdfJobUntilTerminal, pollCostUploadJobUntilTerminal, pollKsefCostPreviewJobUntilTerminal } from '@/utils/pollAsyncJob';
import { ksefStartResponseJobId } from '@/utils/ksefJobHelpers';
import { costPdfFailedFromJob } from '@/utils/pdfBatchFailedMaps';
import { FinanceService } from '@/service/FinanceService.ts';
import { UtilsService } from '@/service/UtilsService.ts';
import { useSupplierStore } from '@/stores/suppliers';
import { createEmptySupplier } from '@/composables/useSupplierForm';
import { ActiveStatus, type Address } from '@/types/Customer.ts';

export const useCostStore = defineStore('cost', {
  state: () => ({
    rowsPerPage: parseInt(localStorage.getItem('rowsPerPageCost') || '20', 10),
    loadingCosts: false,
    loadingCostNumber: false,
    loadingFile: false,
    loadingCostUpload: false,
    costs: [] as Cost[],
    totalCosts: 0,
    currentPage: 0,
    sortField: 'sellDate',
    sortOrder: -1 as 1 | -1,
    filters: {} as any,
  }),

  getters: {
    getSortedCosts: (state) => state.costs.slice().sort((a, b) => a.id - b.id),
  },

  actions: {
    async updateRowsPerPage(rows: number) {
      if (rows !== undefined) {
        this.rowsPerPage = rows;
        localStorage.setItem('rowsPerPageCost', rows.toString());
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
        direction: this.sortOrder > 0 ? 'ASC' : 'DESC',
      });

      if (this.filters.global?.value) {
        params.append('globalFilter', this.filters.global.value);
      }

      if (this.filters.supplier?.value) {
        const supplier = this.filters.supplier.value;
        if (Array.isArray(supplier) && supplier.length > 0 && supplier[0].id) {
          params.append('idSupplier', supplier[0].id.toString());
        } else if (!Array.isArray(supplier) && supplier.id) {
          params.append('idSupplier', supplier.id.toString());
        }
      }

      if (this.filters.sellDate?.constraints?.[0]?.value) {
        const date = new Date(this.filters.sellDate.constraints[0].value);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        params.append('sellDate', `${year}-${month}-${day}`);

        const matchMode = this.filters.sellDate.constraints[0].matchMode;
        let dateComparisonType = 'EQUALS';

        if (matchMode === 'dateIs') {
          dateComparisonType = 'EQUALS';
        } else if (matchMode === 'dateBefore') {
          dateComparisonType = 'BEFORE';
        } else if (matchMode === 'dateAfter') {
          dateComparisonType = 'AFTER';
        }

        params.append('dateComparisonType', dateComparisonType);
      }

      if (this.filters.amount?.constraints?.[0]?.value) {
        params.append('amount', this.filters.amount.constraints[0].value.toString());

        const matchMode = this.filters.amount.constraints[0].matchMode;
        let amountComparisonType = 'EQUALS';

        if (matchMode === 'equals') {
          amountComparisonType = 'EQUALS';
        } else if (matchMode === 'lt') {
          amountComparisonType = 'LESS_THAN';
        } else if (matchMode === 'lte') {
          amountComparisonType = 'LESS_THAN_OR_EQUAL';
        } else if (matchMode === 'gt') {
          amountComparisonType = 'GREATER_THAN';
        } else if (matchMode === 'gte') {
          amountComparisonType = 'GREATER_THAN_OR_EQUAL';
        }

        params.append('amountComparisonType', amountComparisonType);
      }

      if (this.filters.paymentStatus?.value) {
        params.append('status', this.filters.paymentStatus.value);
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
      console.log('START - addCostDb()');
      const payload = {
        ...cost,
        sellDate: cost.sellDate ? moment(cost.sellDate).format('YYYY-MM-DD') : null,
        invoiceDate: cost.invoiceDate ? moment(cost.invoiceDate).format('YYYY-MM-DD') : null,
        paymentDate: cost.paymentDate ? moment(cost.paymentDate).format('YYYY-MM-DD') : null,
      };
      await httpCommon.post(`/goahead/cost`, payload);
      if (!options?.skipListRefresh) {
        await this.getCostsFromDb(this.currentPage);
      }
    },

    async updateCostDb(cost: Cost) {
      const payload = {
        ...cost,
        sellDate: cost.sellDate ? moment(cost.sellDate).format('YYYY-MM-DD') : null,
        invoiceDate: cost.invoiceDate ? moment(cost.invoiceDate).format('YYYY-MM-DD') : null,
        paymentDate: cost.paymentDate ? moment(cost.paymentDate).format('YYYY-MM-DD') : null,
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
      const deletesAllVisible = this.costs.length > 0 && deletingFromPage.length === this.costs.length;

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
          responseType: 'blob',
        });
        return response;
      } catch (error) {
        console.error('Błąd podczas pobierania PDF z S3', error);
        throw error;
      }
    },

    assertCostUploadFile(file: File) {
      const maxBytes = 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error('Plik jest za duży. Maksymalny rozmiar to 10 MB.');
      }

      const name = file.name.toLowerCase();
      const mime = (file.type || '').toLowerCase();
      const allowedMime =
        mime === 'application/pdf' ||
        mime.startsWith('image/') ||
        name.endsWith('.pdf') ||
        /\.(jpe?g|png|gif|webp|bmp|tiff?)$/.test(name);

      if (!allowedMime) {
        throw new Error('Obsługiwane są wyłącznie pliki PDF oraz obrazy.');
      }
    },

    async requestCostUploadUrl(fileName: string, contentType: string): Promise<CostUploadUrlResponse> {
      const payload: CostUploadUrlRequest = { fileName, contentType, module: 'GO_AHEAD' };
      const { data } = await httpCommon.post<CostUploadUrlResponse>(`/v1/files/upload-url`, payload);
      if (!data?.uploadUrl) {
        throw new Error('Brak adresu uploadu w odpowiedzi serwera.');
      }
      return data;
    },

    async uploadCostFileToS3(uploadUrl: string, file: File): Promise<void> {
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });
    },

    parseUploadRaw(raw: unknown): unknown {
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return raw;
    },

    buildSupplierDraftFromUpload(raw: unknown): Partial<Supplier> | null {
      const parsed = this.parseUploadRaw(raw);
      const record = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      const sellerRaw = record.supplier;
      const costConverted = this.convertResponse(parsed);
      const source =
        sellerRaw && typeof sellerRaw === 'object'
          ? (sellerRaw as Partial<Supplier>)
          : costConverted.supplier
            ? (costConverted.supplier as Partial<Supplier>)
            : null;

      if (!source) return null;

      const empty = createEmptySupplier();
      const addr = source.address && typeof source.address === 'object' ? (source.address as Address) : null;

      return {
        ...empty,
        id: 0,
        status: ActiveStatus.ACTIVE,
        name: source.name?.trim() || empty.name,
        nip: source.nip ? UtilsService.normalizeNipDigits(String(source.nip)) : empty.nip,
        regon: source.regon?.trim() || empty.regon,
        phone: source.phone?.trim() || empty.phone,
        mail: source.mail?.trim() || empty.mail,
        otherInfo: source.otherInfo?.trim() || empty.otherInfo,
        accountNumber: source.accountNumber?.trim() || empty.accountNumber,
        bankName: source.bankName?.trim() || empty.bankName,
        address: {
          ...empty.address,
          id: 0,
          city: addr?.city?.trim() || empty.address.city,
          street: addr?.street?.trim() || empty.address.street,
          zip: addr?.zip?.trim() || empty.address.zip,
        },
      };
    },

    buildSupplierDraftFromEntity(source: Partial<Supplier> | null | undefined): Partial<Supplier> | null {
      if (!source) return null;
      return this.buildSupplierDraftFromUpload({ supplier: source });
    },

    resolveSupplierForUploadedCost(cost: Cost, raw: unknown): { supplier: Supplier | null; matched: boolean } {
      const supplierStore = useSupplierStore();
      const suppliers = supplierStore.suppliers;

      const supplierFromCost = cost.supplier;
      if (supplierFromCost?.id) {
        const byId = suppliers.find((s) => s.id === supplierFromCost.id);
        if (byId) return { supplier: byId, matched: true };
      }

      const rawRecord = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const supplier = rawRecord.supplier;
      const nipSource =
        (supplierFromCost?.nip ?? '') ||
        (supplier && typeof supplier === 'object' && 'nip' in supplier ? String((supplier as { nip?: unknown }).nip ?? '') : '');

      const nipDigits = UtilsService.normalizeNipDigits(nipSource);
      if (nipDigits) {
        const byNip = suppliers.find((s) => UtilsService.normalizeNipDigits(s.nip) === nipDigits);
        if (byNip) return { supplier: byNip, matched: true };
      }

      return { supplier: supplierFromCost, matched: false };
    },

    convertUploadCostToForm(raw: unknown): CostUploadResult {
      const parsedRaw = this.parseUploadRaw(raw);
      const cost = this.convertResponse(parsedRaw);
      cost.costItems = (cost.costItems ?? []).map((item) => {
        const next = { ...item, id: 0, idCost: cost.id ?? 0 };
        FinanceService.updateCostItemAmounts(next);
        return next;
      });

      const { supplier, matched } = this.resolveSupplierForUploadedCost(cost, parsedRaw);
      cost.supplier = supplier;

      return {
        cost,
        partial: false,
        supplierMatched: matched,
        supplierDraft: matched ? null : this.buildSupplierDraftFromUpload(parsedRaw),
      };
    },

    async uploadCostFromFile(file: File): Promise<CostUploadResult> {
      this.assertCostUploadFile(file);
      this.loadingCostUpload = true;

      try {
        const supplierStore = useSupplierStore();
        if (supplierStore.suppliers.length <= 1) {
          await supplierStore.getSuppliersFromDb('ALL');
        }

        const contentType = file.type || 'application/octet-stream';
        const { uploadUrl, objectKey, jobId: initialJobId } = await this.requestCostUploadUrl(file.name, contentType);
        await this.uploadCostFileToS3(uploadUrl, file);

        let jobId = initialJobId ?? null;
        if (jobId == null && objectKey) {
          const completePayload: CostUploadCompleteRequest = { objectKey };
          const completeResponse = await httpCommon.post<unknown>(`/v1/files/upload/confirm`, completePayload, {
            validateStatus: (status) => status === 200 || status === 202,
          });
          jobId = ksefStartResponseJobId(completeResponse.data);
        }

        if (jobId == null) {
          throw new Error('Brak identyfikatora zadania po wgraniu pliku.');
        }

        const finalStatus = await pollCostUploadJobUntilTerminal(httpCommon, jobId);
        if (finalStatus.status === 'FAILED') {
          throw new Error(finalStatus.message ?? 'Odczyt danych z pliku nie powiódł się.');
        }

        const draft = finalStatus.textractResultJson;
        if (!draft) {
          throw new Error('Serwer nie zwrócił danych kosztu po przetworzeniu pliku.');
        }

        const result = this.convertUploadCostToForm(draft);
        result.partial = finalStatus.status === 'PARTIAL';
        return result;
      } finally {
        this.loadingCostUpload = false;
      }
    },

    /**
     * Generuje PDF dla wielu kosztów (async job).
     * Backend: POST /goahead/cost/pdf body [id,...] → 202 + { jobId }; GET .../cost/pdf/jobs/{jobId}.
     */
    async generateCostsPdf(costIds: number[]): Promise<{
      failed: { idCost: number; costNumber: string }[];
    }> {
      if (!costIds?.length) return { failed: [] };
      const unique = [...new Set(costIds)];
      console.log('START - generateCostsPdf()', unique);
      this.loadingFile = true;
      try {
        const response = await httpCommon.post<unknown>(`/goahead/cost/pdf`, unique, {
          validateStatus: (status) => status === 200 || status === 202,
        });

        const jobId = ksefStartResponseJobId(response.data);

        if (response.status === 200 && jobId == null) {
          await this.getCostsFromDb(this.currentPage);
          return { failed: [] };
        }

        if (jobId == null) {
          await this.getCostsFromDb(this.currentPage);
          return {
            failed: unique.map((id) => ({
              idCost: id,
              costNumber: this.costs.find((c) => c.id === id)?.number ?? String(id),
            })),
          };
        }

        let finalStatus;
        try {
          finalStatus = await pollCostPdfJobUntilTerminal(httpCommon, jobId);
        } catch {
          await this.getCostsFromDb(this.currentPage);
          return {
            failed: unique.map((id) => ({
              idCost: id,
              costNumber: this.costs.find((c) => c.id === id)?.number ?? String(id),
            })),
          };
        }

        const failed = costPdfFailedFromJob(unique, finalStatus, this.costs);
        await this.getCostsFromDb(this.currentPage);
        return { failed };
      } finally {
        this.loadingFile = false;
        console.log('END - generateCostsPdf()');
      }
    },

    /**
     * Synchronizacja / pobieranie kosztów z KSeF (async job). Wynik w bazie — odśwież listę stroną.
     * Backend: POST /goahead/cost/ksef { fromDate, toDate } → 202 + { jobId }; GET .../cost/ksef/jobs/{jobId} (brak listy kosztów w odpowiedzi).
     */
    async fetchKsefNewCostsPreview(fromDate: string, toDate: string): Promise<KsefCostPreviewFetchResult> {
      const response = await httpCommon.post<unknown>(
        `/goahead/cost/ksef`,
        { fromDate, toDate },
        {
          validateStatus: (status) => status === 202,
        }
      );

      const jobId = ksefStartResponseJobId(response.data);
      if (jobId == null) {
        return { ok: false, message: 'Brak jobId w odpowiedzi serwera po starcie pobierania kosztów z KSeF.' };
      }

      let finalStatus;
      try {
        finalStatus = await pollKsefCostPreviewJobUntilTerminal(httpCommon, jobId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Nie udało się sprawdzić statusu zadania KSeF.';
        return { ok: false, message: msg };
      }

      if (finalStatus.status === 'FAILED') {
        const fromErrors = finalStatus.errors?.map((e) => `${e.costId ?? '?'}: ${e.message}`).join('; ');
        const message =
          [finalStatus.message, fromErrors].filter(Boolean).join(' — ') ||
          'Pobieranie kosztów z KSeF nie powiodło się.';
        return { ok: false, message };
      }

      const total =
        typeof finalStatus.total === 'number' && Number.isFinite(finalStatus.total)
          ? finalStatus.total
          : 0;

      return {
        ok: true,
        partial: finalStatus.status === 'PARTIAL',
        total,
      };
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
        page: '0',
        size: '1',
        sort: this.sortField,
        direction: this.sortOrder > 0 ? 'ASC' : 'DESC',
      });
      params.append('idSupplier', supplierId.toString());
      const response = await httpCommon.get(`/goahead/cost/page?${params.toString()}`);
      return (response.data.totalElements as number) > 0;
    },

    convertResponse(cost: any): Cost {
      return {
        ...cost,
        number: cost.number ?? cost.costNumber ?? '',
        supplier: cost.supplier ?? null,
        sellDate: cost.sellDate ? new Date(cost.sellDate) : null,
        invoiceDate: cost.invoiceDate ? new Date(cost.invoiceDate) : null,
        paymentDate: cost.paymentDate ? new Date(cost.paymentDate) : null,
      };
    },
  },
});
