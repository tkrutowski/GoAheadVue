import { CustomerType } from "@/types/CustomerType.ts";
import { CustomerStatus } from "@/types/CustomerStatus.ts";

export interface Customer {
  id: number;
  name: string;
  firstName: string;
  nip: string;
  phone: string;
  mail: string;
  customerType: CustomerType | undefined;
  otherInfo: string;
  customerStatus: CustomerStatus;
  regon: string;
  address: Address;
}

export interface Address {
  id: number;
  city: string;
  street: string;
  zip: string;
}
