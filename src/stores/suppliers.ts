import { defineStore } from 'pinia';
import httpCommon from '@/config/http-common.ts';
import { type Supplier } from '@/types/Supplier.ts';
import { ActiveStatus } from '@/types/Customer.ts';
import { createEmptySupplier } from '@/composables/useSupplierForm';

export const useSupplierStore = defineStore('supplier', {
  state: () => ({
    loginError: false,
    btnDisabled: false,
    busyIcon: false,
    loadingSupplier: false,
    suppliers: [] as Supplier[],
  }),

  getters: {
    getSupplierById(state) {
      return (id: number): Supplier | undefined => {
        return state.suppliers.find((supplier) => supplier.id === id);
      };
    },
    getSortedSuppliers: (state) => {
      return [...state.suppliers].sort((a: Supplier, b: Supplier) => a.name.localeCompare(b.name));
    },
    getSupplierActive: (state) => state.suppliers.filter((s) => s.status === ActiveStatus.ACTIVE),
  },

  actions: {
    normalizeSupplier(data: unknown): Supplier {
      const empty = createEmptySupplier();
      if (!data || typeof data !== 'object') return empty;
      const raw = data as Record<string, unknown>;
      const addr = raw.address && typeof raw.address === 'object' ? (raw.address as Supplier['address']) : empty.address;
      const statusRaw = raw.status;
      const status =
        statusRaw === ActiveStatus.ACTIVE || statusRaw === ActiveStatus.INACTIVE
          ? (statusRaw as ActiveStatus)
          : ActiveStatus.ACTIVE;

      return {
        ...empty,
        ...(raw as Partial<Supplier>),
        status,
        address: { ...empty.address, ...addr, id: addr.id ?? 0 },
      };
    },

    async getSuppliersFromDb(supplierStatus: string) {
      console.log('START - getSuppliersFromDb(' + supplierStatus + ')');
      this.loadingSupplier = true;
      const response = await httpCommon.get(`/goahead/supplier?status=` + supplierStatus).finally(() => (this.loadingSupplier = false));
      console.log('getSuppliersFromDb() - size[]: ' + response.data.length);
      this.suppliers = (response.data as unknown[]).map((item) => this.normalizeSupplier(item));
      console.log('END - getSuppliersFromDb()');
      return response.data;
    },

    async getSupplierFromDb(supplierId: number): Promise<Supplier | null> {
      console.log('START - getSupplierFromDb(' + supplierId + ')');
      this.loadingSupplier = true;
      const response = await httpCommon.get(`/goahead/supplier/` + supplierId);
      console.log('END - getSupplierFromDb()');
      this.loadingSupplier = false;
      return response.data ? this.normalizeSupplier(response.data) : null;
    },

    async updateSupplierStatusDb(supplierId: number, status: ActiveStatus) {
      console.log('START - updateSupplierStatusDb()');
      await httpCommon.put(`/goahead/supplier/supplierstatus/` + supplierId, {
        value: status,
      });
      const supplier = this.suppliers.find((item) => item.id === supplierId);
      if (supplier) {
        supplier.status = status;
      }
      console.log('END - updateSupplierStatusDb()');
      return true;
    },

    async addSupplierDb(supplier: Supplier): Promise<Supplier> {
      console.log('START - addSupplierDb()');
      const payload: Supplier = { ...supplier, status: ActiveStatus.ACTIVE };
      const response = await httpCommon.post(`/goahead/supplier`, payload);
      const saved = this.normalizeSupplier(response.data);
      const index = this.suppliers.findIndex((item) => item.id === saved.id);
      if (index !== -1) {
        this.suppliers.splice(index, 1, saved);
      } else {
        this.suppliers.push(saved);
      }
      console.log('END - addSupplierDb()');
      return saved;
    },

    async updateSupplierDb(supplier: Supplier) {
      console.log('START - updateSupplierDb()');
      const response = await httpCommon.put(`/goahead/supplier`, supplier);
      const index = this.suppliers.findIndex((item) => item.id === supplier.id);
      if (index !== -1) this.suppliers.splice(index, 1, response.data);
      console.log('END - updateSupplierDb()');
    },

    async deleteSupplierDb(supplierId: number) {
      console.log('START - deleteSupplierDb()');
      await httpCommon.delete(`/goahead/supplier/` + supplierId);
      const index = this.suppliers.findIndex((item) => item.id === supplierId);
      if (index !== -1) this.suppliers.splice(index, 1);
      console.log('END - deleteSupplierDb()');
    },
  },
});
