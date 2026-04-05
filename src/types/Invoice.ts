import type {Customer} from "@/types/Customer.ts";
import type {Vat} from "@/types/Cost.ts";

export interface Invoice {
  idInvoice: number;
  customer: Customer | null;
  number: string;
  sellDate: Date | null;
  invoiceDate:  Date | null;
  paymentDate:  Date | null;
  paymentDeadline: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  otherInfo: string;
  ksefNumber: string;
  upoUrl: string;
  ksefUrl: string;
  pdfUrl: string;
  invoiceItems: InvoiceItem[];
}
// export default Invoice
export interface InvoiceItem {
  idInvoiceItem: number;
  idInvoice: number;
  name: string;
  unit: string;
  quantity: number;
  amount: number;
  vat: Vat;
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