// import InvoiceItem from "@/assets/types/InvoiceItem";

import { PaymentStatus } from "@/assets/types/PaymentStatus";
import { PaymentMethod } from "@/assets/types/PaymentMethod";

export interface Invoice {
  idInvoice: number;
  idCustomer: number;
  invoiceNumber: string;
  sellDate: string;
  invoiceDate: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDeadline: number;
  paymentDate: string;
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
