import type {Invoice, InvoiceItem} from "@/types/Invoice.ts";

export const FinanceService = {

    getInvoiceAmount (inv : Invoice): number {
        if (!inv) return 0;
        return inv.invoiceItems.reduce((acc, item) => {
            return acc + item.quantity * item.amount;
        }, 0);
    },

    getInvoiceItemAmount (item : InvoiceItem): number {
        if (!item) return 0;
        return item.quantity * item.amount;
    }


}
