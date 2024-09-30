// import InvoiceItem from "@/assets/types/InvoiceItem";

import { PaymentStatus } from "@/types/PaymentStatus.ts";
import { PaymentMethod } from "@/types/PaymentMethod.ts";

export interface Invoice {
  idInvoice: number;
  idCustomer: number;
  invoiceNumber: string;
  amount: number;
  sellDate: Date | undefined;
  invoiceDate:  Date | undefined;
  paymentDate:  Date | undefined;
  paymentDeadline: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  otherInfo: string;
  invoiceItems: InvoiceItem[];
  customerName: string;
}
// export default Invoice
export interface InvoiceItem {
  id: number;
  idInvoice: number;
  name: string;
  jm: string;
  quantity: number;
  amount: number;
}

export interface InvoiceDto {
  idInvoice: number;
  customer: string;
  invoiceNumber: string;
  sellDate: Date | undefined;
  invoiceDate:  Date | undefined;
  paymentMethod: string;
  paymentStatus: string;
  paymentDeadline: number;
  paymentDate:  Date | undefined;
  otherInfo: string;
  invoiceItems: InvoiceItem[];
  amount: number;
}