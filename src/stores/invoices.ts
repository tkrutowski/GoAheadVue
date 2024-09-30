import {defineStore} from "pinia";
import httpCommon from "@/http-common";
import {Invoice, InvoiceDto} from "@/types/Invoice";
import {PaymentStatus} from "@/types/PaymentStatus";
import {PaymentMethod} from "@/types/PaymentMethod";
import {ErrorService} from "@/service/ErrorService";
import {useCustomerStore} from "@/stores/customers.ts";

export const useInvoiceStore = defineStore("invoice", {
    state: () => ({
        loginError: false,
        btnDisabled: false,
        busyIcon: false,
        loadingInvoices: false,
        loadingInvoiceNo: false,
        loadingPaymentType: false,
        loadingFile: false,
        loadingWait: false,
        invoices: [] as Invoice[],
        paymentTypes: [] as PaymentMethod[],
    }),

    //getters = computed
    getters: {
        getSortedInvoices: (state) =>
            state.invoices.sort((a, b) => a.idInvoice - b.idInvoice),
        getInvoiceDtos: (state) => {
            const customerStore=useCustomerStore();
            const invoicesDtos = JSON.parse(JSON.stringify(state.invoices));
            const dtos = invoicesDtos.map(invoice => {
                const dto: InvoiceDto = {};
                dto.idInvoice = invoice.idInvoice;
                dto.amount = invoice.amount;
                dto.invoiceDate = new Date(invoice.invoiceDate);
                dto.invoiceItems = invoice.invoiceItems;
                dto.invoiceNumber = invoice.invoiceNumber;
                dto.customer = customerStore.getCustomerById(invoice.idCustomer)?.firstName + " " + customerStore.getCustomerById(invoice.idCustomer)?.name;
                dto.otherInfo = invoice.otherInfo;
                dto.paymentDate = new Date(invoice.paymentDate);
                dto.paymentDeadline = invoice.paymentDeadline;
                dto.paymentMethod = invoice.paymentMethod.viewName;
                dto.paymentStatus = invoice.paymentStatus.name;
                dto.sellDate = new Date(invoice.sellDate);
                return dto;
            })
            return dtos;
        },
        // getCustomerName: (state) => {
        //   const all = state.invoices.map((inv) => inv.customerName);
        //   return [...new Set(all)];
        // },
    },
    //actions = metody w komponentach
    actions: {
        //
        //GET CUSTOMER'S INVOICES
        //
        async getCustomerInvoices(customerId: number) {
            console.log("geCustomerInvoices() ", customerId);
            if (this.invoices.length === 0) {
                console.log("Downloading Invoices...", this.invoices.length);
                this.loadingWait = true;
                await this.getInvoicesFromDb("ALL");
                this.loadingWait = false;
                console.log("Downloaded Invoices ", this.invoices.length);
            }
            const result = this.invoices.filter(
                (invoice) => invoice.idCustomer === customerId
            );
            console.log("geCustomerInvoices() size: ", result.length);
            return result;
        },

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
            try {
                if (this.invoices.length === 0) {
                    const response = await httpCommon.get(`/goahead/invoice?status=` + paymentStatus);
                    console.log(
                        "getInvoicesFromDb() - Ilosc faktur[]: " + response.data.length
                    );
                    this.invoices = response.data.map((invoice: any) => ({
                        ...invoice,
                        invoiceDate: new Date(invoice.invoiceDate), // Konwersja na obiekt Date
                        sellDate: invoice.sellDate ? new Date(invoice.sellDate) : undefined, // Konwersja jeśli data istnieje
                        paymentDate: invoice.paymentDate ? new Date(invoice.paymentDate) : undefined, // Konwersja jeśli data istnieje
                    }));
                    console.log("getInvoicesFromDb()", this.invoices);
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
            try {
                const response = await httpCommon.get(`/goahead/invoice/` + invoiceId);
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
            try {
                await httpCommon.put(
                    `/goahead/invoice/paymentstatus/` + invoiceId,{value: status.name});
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
            console.log("START - addInvoiceDb()");
            try {
                const response = await httpCommon.post(`/goahead/invoice`, invoice);
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
            try {
                const response = await httpCommon.put(`/goahead/invoice`, invoice);
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
            try {
                await httpCommon.delete(`/goahead/invoice/` + invoiceId);
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
            try {
                if (this.paymentTypes.length === 0) {
                    const response = await httpCommon.get(
                        `/goahead/invoice/paymenttype`);
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

        //
        // DOWNLOAD PDF
        //
        async getInvoicePdfFromDb(invoiceID: number) {
            console.log("START - getInvoicePdfFromDb()");
            this.loadingFile = true;
            try {
                 const response = await httpCommon.get(
                    `/goahead/invoice/pdf/` + invoiceID,
                    {
                        responseType: "blob",
                    }
                );
                 console.log("getInvoicePdfFromDb",response);
                // Sprawdzenie, czy odpowiedź jest prawidłowa
                if (response.status !== 200) {
                    throw new Error(`Błąd serwera: ${response.status}`);
                }
                return response
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
