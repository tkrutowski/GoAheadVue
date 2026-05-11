import type { Address, CustomerStatus } from '@/types/Customer.ts';

export type { Address };

export interface Supplier {
  id: number;
  name: string;
  nip: string;
  regon: string;
  phone: string;
  mail: string;
  otherInfo: string;
  status: CustomerStatus;
  address: Address;
  accountNumber: string;
  bankName: string;
}
