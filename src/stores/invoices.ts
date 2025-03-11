import {defineStore} from "pinia";
import httpCommon from "@/config/http-common.ts";
import {type Invoice, PaymentMethod, PaymentStatus} from "@/types/Invoice";
import moment from "moment";

export const useInvoiceStore = defineStore("invoice", {
    state: () => ({
        rowsPerPage: parseInt(localStorage.getItem("rowsPerPageInvoice") || "10", 10),
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
                (invoice: Invoice) => invoice.customer !== null && invoice.customer.id === customerId
            );
            console.log("geCustomerInvoices() size: ", result.length);
            return result;
        },

        //
        //GET LATEST INVOICE ITEM
        //
        getLatestItemForCustomer(customerId: number | undefined) {
            console.log("getLatestItemForCustomer() ", customerId);
            if (customerId === undefined) {
                return null;
            }
            const itemsForId = this.invoices.filter(
                (invoice) => invoice.customer?.id === customerId
            );
            if (itemsForId.length === 0) {
                return null;
            }
            itemsForId.sort(
                (a: Invoice, b: Invoice) => {
                    const dateA = a.sellDate ? new Date(a.sellDate).getTime() : 0;
                    const dateB = b.sellDate ? new Date(b.sellDate).getTime() : 0;
                    return dateB - dateA;
                }
            );


            return itemsForId[0].invoiceItems[0];
        },

        //
        //GET ALL INVOICES FROM DB BY PAYMENT_STATUS
        //
        async getInvoicesFromDb(paymentStatus: string): Promise<void> {
            console.log("START - getInvoicesFromDb(" + paymentStatus + ")");
            this.loadingInvoices = true;
            const response = await httpCommon.get(`/goahead/invoice?status=` + paymentStatus);
            console.log(
                "getInvoicesFromDb() - Ilosc faktur[]: " + response.data.length
            );
            this.invoices = response.data.map((invoice: any) => this.convertResponse(invoice));
            this.loadingInvoices = false;
            console.log("END - getInvoicesFromDb(" + paymentStatus + ")");
        },

        //
        //GET  INVOICE FROM DB BY ID
        //
        async getInvoiceFromDb(invoiceId: number): Promise<Invoice | undefined> {
            console.log("START - getInvoiceFromDb(" + invoiceId + ")");
            this.loadingInvoices = true;
            const response = await httpCommon.get(`/goahead/invoice/` + invoiceId);
            this.loadingInvoices = false;
            console.log("END - getInvoiceFromDb()");
            return this.convertResponse(response.data);
        },

        //
        //CHANGE PAYMENT_STATUS
        //
        async updateInvoiceStatusDb(invoiceId: number, status: PaymentStatus) {
            console.log("START - updateInvoiceStatusDb()");
            await httpCommon.put(
                `/goahead/invoice/paymentstatus/` + invoiceId, {value: status});
            const inv = this.invoices.find((inv) => inv.idInvoice === invoiceId);
            if (inv) {
                inv.paymentStatus = status;
            }
        },

        //
        //ADD INVOICE
        //
        async addInvoiceDb(invoice: Invoice) {
            console.log("START - addInvoiceDb()", invoice);
            const payload = {
                ...invoice,
                invoiceDate: invoice.invoiceDate ? moment(invoice.invoiceDate).format("YYYY-MM-DD") : null,
                sellDate: invoice.sellDate ? moment(invoice.sellDate).format("YYYY-MM-DD") : null,
                paymentDate: invoice.paymentDate ? moment(invoice.paymentDate).format("YYYY-MM-DD") : null,
            };
            console.log("payload", payload);
            const response = await httpCommon.post(`/goahead/invoice`, payload);
            this.invoices.push(this.convertResponse(response.data));
            console.log("END - addInvoiceDb()");
        },

        //
        //UPDATE INVOICE
        //
        async updateInvoiceDb(invoice: Invoice) {
            console.log("START - updateInvoiceDb()");
            const payload = {
                ...invoice,
                invoiceDate: invoice.invoiceDate ? moment(invoice.invoiceDate).format("YYYY-MM-DD") : null,
                sellDate: invoice.sellDate ? moment(invoice.sellDate).format("YYYY-MM-DD") : null,
                paymentDate: invoice.paymentDate ? moment(invoice.paymentDate).format("YYYY-MM-DD") : null,
            };
            const response = await httpCommon.put(`/goahead/invoice`, payload);
            const index = this.invoices.findIndex(
                (inv) => inv.idInvoice === invoice.idInvoice
            );
            if (index !== -1) this.invoices.splice(index, 1, this.convertResponse(response.data));
            console.log("END - updateInvoiceStatusDb()");
        },

        //
        //DELETE INVOICE
        //
        async deleteInvoiceDb(invoiceId: number) {
            console.log("START - deleteInvoiceDb()");
            await httpCommon.delete(`/goahead/invoice/` + invoiceId);
            const index = this.invoices.findIndex(
                (inv) => inv.idInvoice === invoiceId
            );
            if (index !== -1) this.invoices.splice(index, 1);
            console.log("END - deleteInvoiceDb()");
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
            if (this.paymentTypes.length === 0) {
            this.loadingPaymentType = true;
                const response = await httpCommon.get(
                    `/goahead/invoice/paymenttype`)
                    .finally(() => this.loadingPaymentType = false);
                this.paymentTypes = response.data;
            } else {
                console.log("getPaymentType() - BEZ GET");
            }
        },

        //
        // DOWNLOAD PDF
        //
        async getInvoicePdfFromDb(invoiceID: number) {
            console.log("START - getInvoicePdfFromDb()");
            this.loadingFile = true;
            const response = await httpCommon.get(
                `/goahead/invoice/pdf/` + invoiceID,
                {
                    responseType: "blob",
                }
            );
            console.log("getInvoicePdfFromDb", response);
            // Sprawdzenie, czy odpowiedź jest prawidłowa
            if (response.status !== 200) {
                throw new Error(`Błąd serwera: ${response.status}`);
            }
            this.loadingFile = false;
            console.log("END - getInvoicePdfFromDb()");
            return response
        },

        convertResponse(invoice: Invoice) {
            // console.log("getInvoicesFromDb()", invoice);
            return {
                ...invoice,
                invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : null,
                sellDate: invoice.sellDate ? new Date(invoice.sellDate) : null,
                paymentDate: invoice.paymentDate ? new Date(invoice.paymentDate) : null,
            }
        }
    },
});
