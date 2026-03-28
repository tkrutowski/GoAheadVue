import type { Supplier } from "@/types/Supplier.ts";
import { PaymentMethod, PaymentStatus } from "@/types/Invoice.ts";

export enum Vat {
  VAT_0 = "VAT_0",
  VAT_5 = "VAT_5",
  VAT_8 = "VAT_8",
  VAT_23 = "VAT_23",
  VAT_ZW = "VAT_ZW",
}

export interface CostItem {
  idCostItem: number;
  idCost: number;
  name: string;
  unit: string;
  quantity: number;
  /**
   * Kwota netto za jednostkę.
   */
  amountNet: number;
  /**
   * Stawka VAT (enum).
   */
  vat: Vat;
  /**
   * Kwota VAT dla całej pozycji (readonly w UI, liczona z quantity, amount i vat).
   */
  amountVat: number;
  /**
   * Kwota brutto dla całej pozycji (readonly w UI, liczona z quantity, amount i vat).
   */
  amountGross: number;
}

export interface Cost {
  id: number;
  supplier: Supplier | null;
  number: string;
  sellDate: Date | null;
  invoiceDate: Date | null;
  paymentDate: Date | null;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  otherInfo: string;
  ksefNumber: string;
  ksefUrl: string;
  pdfUrl: string;
  costItems: CostItem[];
}

 