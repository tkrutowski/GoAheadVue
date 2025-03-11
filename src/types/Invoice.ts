import type {Customer} from "@/types/Customer.ts";

export interface Invoice {
  idInvoice: number;
  customer: Customer | null;
  invoiceNumber: string;
  sellDate: Date | null;
  invoiceDate:  Date | null;
  paymentDate:  Date | null;
  paymentDeadline: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  otherInfo: string;
  invoiceItems: InvoiceItem[];
}
// export default Invoice
export interface InvoiceItem {
  id: number;
  idInvoice: number;
  name: string;
  unit: string;
  quantity: number;
  amount: number;
}

export enum PaymentStatus {
  PAID = "PAID",
  TO_PAY = "TO_PAY",
  OVER_DUE = "OVER_DUE",
  ALL = "ALL"
}

export enum PaymentMethod {
  CASH = "CASH",
  CASH_LATE = "CASH_LATE",
  TRANSFER = "TRANSFER",
}