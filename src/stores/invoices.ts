import { defineStore } from "pinia";
import httpCommon from "@/http-common";
import { Invoice } from "@/assets/types/Invoice";
import { useAuthorizationStore } from "@/stores/authorization";
import { PaymentStatus } from "@/assets/types/PaymentStatus";
import { PaymentMethod } from "@/assets/types/PaymentMethod";
import { ErrorService } from "@/service/ErrorService";

export const useInvoiceStore = defineStore("invoice", {
  state: () => ({
    loginError: false,
    btnDisabled: false,
    busyIcon: false,
    loadingInvoices: false,
    loadingInvoiceNo: false,
    loadingPaymentType: false,
    loadingFile: false,
    invoices: [] as Invoice[],
    paymentTypes: [] as PaymentMethod[],
  }),

  //getters = computed
  getters: {
    getSortedInvoices: (state) =>
      state.invoices.sort((a, b) => a.idInvoice - b.idInvoice),
  },

  //actions = metody w komponentach
  actions: {
    //
    //GET LATEST INVOICE ITEM
    //
    getLatestItemForCustomer(customerId: number) {
      console.log("getLatestItemForCustomer() ", customerId);
      const itemsForId = this.invoices.filter(
        (invoice) => invoice.idCustomer === customerId
      );
      if (itemsForId.length === 0) {
        return null;
      }

      itemsForId.sort(
        (a, b) =>
          new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()
      );

      return itemsForId[0].invoiceItems[0];
    },
    //
    //GET ALL INVOICES FROM DB BY PAYMENT_STATUS
    //
    async getInvoicesFromDb(paymentStatus: string): Promise<void> {
      console.log("START - getInvoicesFromDb(" + paymentStatus + ")");
      this.loadingInvoices = true;

      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        if (this.invoices.length === 0) {
          const response = await httpCommon.get(
            `/goahead/invoice?status=` + paymentStatus,
            {
              headers: authorization.token !== "null" ? headers : {},
            }
          );
          console.log(
            "getInvoicesFromDb() - Ilosc faktur[]: " + response.data.length
          );
          this.invoices = response.data;
        } else {
          console.log("getCustomersFromDb() - BEZ GET");
        }
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR getInvoicesFromDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
      } finally {
        this.loadingInvoices = false;
        console.log("END - getInvoicesFromDb(" + paymentStatus + ")");
      }
    },
    //
    //GET  INVOICE FROM DB BY ID
    //
    async getInvoiceFromDb(invoiceId: number): Promise<Invoice | undefined> {
      console.log("START - getInvoiceFromDb(" + invoiceId + ")");
      this.loadingInvoices = true;

      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        const response = await httpCommon.get(`/goahead/invoice/` + invoiceId, {
          headers: authorization.token !== "null" ? headers : {},
        });
        console.log("DB: ", response.data);
        console.log("DB custID: ", response.data.idCustomer);
        return response.data;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR getInvoicesFromDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
      } finally {
        this.loadingInvoices = false;
        console.log("END - getInvoiceFromDb()");
      }
    },
    //
    //CHANGE PAYMENT_STATUS
    //
    async updateInvoiceStatusDb(invoiceId: number, status: PaymentStatus) {
      console.log("START - updateInvoiceStatusDb()");
      console.log(
        "invoice id: " +
          invoiceId +
          ", status: " +
          JSON.stringify(status, null, 2)
      );

      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        await httpCommon.put(
          `/goahead/invoice/paymentstatus/` + invoiceId,
          { value: status.name },
          {
            headers: authorization.token !== "null" ? headers : {},
          }
        );
        const inv = this.invoices.find((inv) => inv.idInvoice === invoiceId);
        if (inv) {
          inv.paymentStatus = status;
        }
        return true;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR updateInvoiceStatusDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
        return false;
      } finally {
        console.log("END - updateInvoiceStatusDb()");
      }
    },
    //
    //ADD INVOICE
    //
    async addInvoiceDb(invoice: Invoice) {
      console.log("START - addInvoiceDb(", invoice, ")");
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        const response = await httpCommon.post(`/goahead/invoice`, invoice, {
          headers: authorization.token !== "null" ? headers : {},
        });
        this.invoices.push(response.data);
        return true;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR: ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
        return false;
      } finally {
        console.log("END - addInvoiceDb()");
      }
    },
    //
    //UPDATE INVOICE
    //
    async updateInvoiceDb(invoice: Invoice) {
      console.log("START - updateInvoiceDb()");

      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        const response = await httpCommon.put(`/goahead/invoice`, invoice, {
          headers: authorization.token !== "null" ? headers : {},
        });
        const index = this.invoices.findIndex(
          (inv) => inv.idInvoice === invoice.idInvoice
        );
        if (index !== -1) this.invoices.splice(index, 1, response.data);
        return true;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR updateInvoiceStatusDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
        return false;
      } finally {
        console.log("END - updateInvoiceStatusDb()");
      }
    },
    //
    //DELETE INVOICE
    //
    async deleteInvoiceDb(invoiceId: number) {
      console.log("START - deleteInvoiceDb()");
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        await httpCommon.delete(`/goahead/invoice/` + invoiceId, {
          headers: authorization.token !== "null" ? headers : {},
        });
        const index = this.invoices.findIndex(
          (inv) => inv.idInvoice === invoiceId
        );
        if (index !== -1) this.invoices.splice(index, 1);
        return true;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR deleteInvoiceDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
        return false;
      } finally {
        console.log("END - deleteInvoiceDb()");
      }
    },

    //
    //FIND INVOICE NUMBER
    //
    async findInvoiceNumber(year: number): Promise<number> {
      this.loadingInvoiceNo = true;
      console.log("findInvoiceNumber(", year, ")");
      console.log("this.invoices.length: ", this.invoices.length);
      if (this.invoices.length === 0) {
        console.log("loading invoices from DB");
        await this.getInvoicesFromDb("ALL");
      }
      const newNo = this.invoices
        .filter((value) => value.invoiceNumber.includes(String(year)))
        .map((value) => value.invoiceNumber.split("/")[1])
        .map((value) => parseInt(value))
        .sort((a, b) => a - b)
        .pop();
      console.log("new fv number: ", newNo);
      this.loadingInvoiceNo = false;
      return newNo ? newNo + 1 : 1;
    },

    //
    //GET PAYMENT TYPE
    //
    async getPaymentType() {
      console.log("START - getPaymentType()");
      this.loadingPaymentType = true;
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        if (this.paymentTypes.length === 0) {
          const response = await httpCommon.get(
            `/goahead/invoice/paymenttype`,
            {
              headers: authorization.token !== "null" ? headers : {},
            }
          );
          this.paymentTypes = response.data;
        } else {
          console.log("getPaymentType() - BEZ GET");
        }
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR getPaymentType(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
      } finally {
        this.loadingPaymentType = false;
        console.log("END - getPaymentType()");
      }
    },

    async getInvoicePdfFromDb(invoiceID: number, invoiceNumber: string) {
      console.log("START - getInvoicePdfFromDb()");
      this.loadingFile = true;
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        const response = await httpCommon.get(
          `/goahead/invoice/pdf/` + invoiceID,
          {
            headers: authorization.token !== "null" ? headers : {},
            responseType: "blob",
          }
        );
        // this.paymentTypes = response.data;
        const fileURL = window.URL.createObjectURL(new Blob([response.data]));
        const fileLink = document.createElement("a");
        fileLink.href = fileURL;
        fileLink.setAttribute("download", "faktura_" + invoiceNumber + ".pdf");
        document.body.appendChild(fileLink);
        // this.btnDisabled = false;
        fileLink.click();
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR getInvoicePdfFromDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
      } finally {
        this.loadingFile = false;
        console.log("END - getInvoicePdfFromDb()");
      }
    },
  },
});
