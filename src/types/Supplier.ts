import type { Address, ActiveStatus } from '@/types/Customer.ts';

export type { Address };

export interface Supplier {
  id: number;
  name: string;
  nip: string;
  regon: string;
  phone: string;
  mail: string;
  otherInfo: string;
  status: ActiveStatus;
  address: Address;
  accountNumber: string;
  bankName: string;
}
