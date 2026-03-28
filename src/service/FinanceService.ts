import type { Invoice, InvoiceItem } from "@/types/Invoice.ts";
import type { Cost, CostItem } from "@/types/Cost.ts";
import { Vat } from "@/types/Cost.ts";

export const FinanceService = {
  getInvoiceAmount(inv: Invoice): number {
    if (!inv) return 0;
    return inv.invoiceItems.reduce((acc, item) => {
      return acc + item.quantity * item.amount;
    }, 0);
  },

  getInvoiceItemAmount(item: InvoiceItem): number {
    if (!item) return 0;
    return item.quantity * item.amount;
  },

  getVatRate(vat: Vat): number {
    switch (vat) {
      case Vat.VAT_5:
        return 0.05;
      case Vat.VAT_8:
        return 0.08;
      case Vat.VAT_23:
        return 0.23;
      case Vat.VAT_0:
      case Vat.VAT_ZW:
      default:
        return 0;
    }
  },

  getCostItemNet(item: CostItem): number {
    if (!item) return 0;
    return item.quantity * item.amountNet;
  },

  getCostItemVat(item: CostItem): number {
    if (!item) return 0;
    const net = this.getCostItemNet(item);
    return net * this.getVatRate(item.vat);
  },

  getCostItemGross(item: CostItem): number {
    if (!item) return 0;
    const net = this.getCostItemNet(item);
    const vat = this.getCostItemVat(item);
    return net + vat;
  },

  updateCostItemAmounts(item: CostItem): void {
    const net = this.getCostItemNet(item);
    const vat = this.getCostItemVat(item);
    item.amountVat = vat;
    item.amountGross = net + vat;
  },

  getCostTotalGross(cost: Cost): number {
    if (!cost || !cost.costItems) return 0;
    return cost.costItems.reduce((acc, item) => {
      return acc + this.getCostItemGross(item);
    }, 0);
  },
};
