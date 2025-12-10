import {defineStore} from "pinia";
import httpCommon from "@/config/http-common.ts";
import axios from "axios";
import {type Invoice, PaymentMethod, PaymentStatus} from "@/types/Invoice";
import moment from "moment";

export const useInvoiceStore = defineStore("invoice", {
    state: () => ({
        rowsPerPage: parseInt(localStorage.getItem("rowsPerPageInvoice") || "20", 10),
        loginError: false,
        btnDisabled: false,
        busyIcon: false,
        loadingInvoices: false,
        loadingInvoiceNo: false,
        loadingPaymentType: false,
        loadingFile: false,
        loadingWait: false,
        invoices: [] as Invoice[],
        totalInvoices: 0,
        currentPage: 0,
        paymentTypes: [] as PaymentMethod[],
        sortField: 'number',
        sortOrder: -1, // 1 = ASC, -1 = DESC - domyślnie sortujemy po dacie sprzedaży malejąco
        filters: {} as any,
    }),

    //getters = computed
    getters: {
        getSortedInvoices: (state) =>
            state.invoices.sort((a, b) => a.idInvoice - b.idInvoice),
    },
    //actions = metody w komponentach
    actions: {
        //
        //UPDATE ROWS PER PAGE
        //
        async updateRowsPerPage(rows: number) {
            console.log(`updateRowsPerPage(rows: ${rows})`);
            if (rows !== undefined) {
                this.rowsPerPage = rows;
                localStorage.setItem("rowsPerPageInvoice", rows.toString());
            }
        },
        //
        //SORT INVOICES
        //
        async sortInvoices(sortField: string, sortOrder: number) {
            console.log('sortInvoices()', sortField, sortOrder);
            this.sortField = sortField;
            this.sortOrder = sortOrder;
            await this.getInvoicesFromDb(0); // Reset to first page after sort
        },
        //
        //FILTER INVOICES
        //
        async filterInvoices(filters: any, rows?: number) {
            console.log(`filterInvoices(${filters.toString()}, rows: ${rows})`);
            this.filters = filters;
            if (rows !== undefined) {
                await this.getInvoicesFromDb(0, rows); // Reset to first page after filter
            } else {
                await this.getInvoicesFromDb(0); // Reset to first page after filter
            }
        },
        //
        //GET CUSTOMER'S INVOICES
        //
        async getCustomerInvoices(customerId: number) {
            console.log("geCustomerInvoices() ", customerId);
            if (this.invoices.length === 0) {
                console.log("Downloading Invoices...", this.invoices.length);
                this.loadingWait = true;
                await this.getInvoicesFromDb(0);
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
        //GET INVOICES FROM DB WITH PAGINATION
        //
        async getInvoicesFromDb(page: number = 0, size?: number): Promise<void> {
            const pageSize = size || this.rowsPerPage;
            console.log(`START - getInvoicesFromDb(page: ${page}, size: ${pageSize})`);
            this.loadingInvoices = true;

            // parameters
            const params = new URLSearchParams({
                page: page.toString(),
                size: pageSize.toString(),
                sort: this.sortField,
                direction: this.sortOrder > 0 ? 'ASC' : 'DESC',
            });

            // filters
            if (this.filters.global?.value) {
                params.append('globalFilter', this.filters.global.value);
            }
            if (this.filters.customer?.value && Array.isArray(this.filters.customer.value) && this.filters.customer.value.length > 0) {
                // If multiple customers selected, we'll use the first one or handle differently
                // For now, using first selected customer
                params.append('idCustomer', this.filters.customer.value[0].id.toString());
            }
            if (this.filters.sellDate?.constraints?.[0]?.value) {
                const date = new Date(this.filters.sellDate.constraints[0].value);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                params.append('sellDate', `${year}-${month}-${day}`);

                // Map PrimeVue FilterMatchMode to backend dateComparisonType
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

                // Map PrimeVue FilterMatchMode to backend amountComparisonType
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

            console.log('INVOICES params: ' + params.toString());
            const response = await httpCommon.get(`/goahead/invoice/page?${params.toString()}`);
            console.log('getInvoicesFromDb() - Ilość[]: ' + response.data.content.length);
            let invoices = response.data.content.map((invoice: any) => this.convertResponse(invoice));
            
            // Jeśli sortujemy po number, popraw sortowanie numeryczne po stronie klienta
            // (backend może sortować jako string, więc poprawiamy to tutaj)
            if (this.sortField === 'number') {
                invoices = invoices.sort((a: Invoice, b: Invoice) => {
                    // Parsuj numer faktury (format: YYYY/N lub YYYY/NN)
                    const parseInvoiceNumber = (invoiceNumber: string): number => {
                        const parts = invoiceNumber.split('/');
                        if (parts.length === 2) {
                            const year = parseInt(parts[0]);
                            const number = parseInt(parts[1]);
                            // Sortuj najpierw po roku, potem po numerze
                            return year * 10000 + number;
                        }
                        return 0;
                    };
                    
                    const numA = parseInvoiceNumber(a.invoiceNumber || '');
                    const numB = parseInvoiceNumber(b.invoiceNumber || '');
                    
                    return this.sortOrder > 0 ? numA - numB : numB - numA;
                });
            }
            
            this.invoices = invoices;
            this.totalInvoices = response.data.totalElements;
            this.currentPage = response.data.number;
            this.loadingInvoices = false;
            console.log("END - getInvoicesFromDb()");
        },

        //
        //GET INVOICE FROM DB BY ID
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
            // Refresh current page after status update
            await this.getInvoicesFromDb(this.currentPage);
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
            await httpCommon.post(`/goahead/invoice`, payload);
            // Refresh current page after adding invoice
            await this.getInvoicesFromDb(this.currentPage);
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
            await httpCommon.put(`/goahead/invoice`, payload);
            // Refresh current page after updating invoice
            await this.getInvoicesFromDb(this.currentPage);
            console.log("END - updateInvoiceDb()");
        },

        //
        //DELETE INVOICE
        //
        async deleteInvoiceDb(invoiceId: number) {
            console.log("START - deleteInvoiceDb()");
            await httpCommon.delete(`/goahead/invoice/` + invoiceId);
            // Refresh current page after deleting invoice
            // If current page becomes empty, go to previous page
            if (this.invoices.length === 1 && this.currentPage > 0) {
                await this.getInvoicesFromDb(this.currentPage - 1);
            } else {
                await this.getInvoicesFromDb(this.currentPage);
            }
            console.log("END - deleteInvoiceDb()");
        },

        //
        //FIND INVOICE NUMBER
        //
        async findInvoiceNumber(year: number): Promise<number> {
            this.loadingInvoiceNo = true;
            console.log("findInvoiceNumber(", year, ")");
            const res = await httpCommon.get(`/goahead/invoice/number/` + year);
            console.log("new fv number: ", res);
            this.loadingInvoiceNo = false;
            return res.data;
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

        async getStatistics() {
            console.log("START - getStatistics()");
            this.loadingInvoices = true;
            const response = await httpCommon.get(
                `/goahead/invoice/status`);
            console.log("getStatistics", response);
            this.loadingInvoices = false;
            console.log("END - getStatistics()");
            return response.data;
        },

        async getStatisticsByCustomer(year: number) {
            console.log("START - getStatisticsByCustomer()");
            this.loadingInvoices = true;
            const response = await httpCommon.get(
                `/goahead/invoice/status/${year}`);
            console.log("getStatisticsByCustomer", response);
            this.loadingInvoices = false;
            console.log("END - getStatisticsByCustomer()");
            return response.data;
        },

        //
        // DOWNLOAD PDF
        //
        async getInvoicePdfFromDb(invoiceID: number) {
            console.log("START - getInvoicePdfFromDb()");
            this.loadingFile = true;
            const response = await httpCommon.get(
                `/goahead/invoice/pdf/` + invoiceID,
            );
            console.log("getInvoicePdfFromDb", response);
            const responseFromS3= await this.getPdfFromS3(response.data);
            this.loadingFile = false;
            console.log("END - getInvoicePdfFromDb()");
            return responseFromS3;
        },

        async getPdfFromS3(url: string) {
            console.log("START - getPdfFromS3()");
            try {
                // Używamy "czystej" instancji axios zamiast httpCommon.
                // httpCommon może dodawać globalne nagłówki (np. autoryzacji),
                // które powodują błąd 400 Bad Request przy zapytaniu do S3.
                const response = await axios.get(url, {
                    responseType: 'blob', // Ważne: odbierz dane jako Blob
                });
                console.log("getPdfFromS3() - response status:", response.status);
                console.log("getPdfFromS3() - response data (blob):", response.data);
                return response;
            } catch (error) {
                console.error("Błąd podczas pobierania PDF z S3", error);
                throw error;
            }
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
