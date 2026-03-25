import type { Address, CustomerStatus } from "@/types/Customer.ts";

export type { Address };

export interface Supplier {
  id: number;
  name: string;
  nip: string;
  phone: string;
  mail: string;
  otherInfo: string;
  customerStatus: CustomerStatus;
  address: Address;
  accountNumber: string;
}
