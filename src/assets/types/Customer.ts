import CustomerType from "@/assets/types/CustomerType";
import CustomerStatusType from "@/assets/types/CustomerStatusType";

export interface Customer {
  id: number;
  name: string;
  firstName: string;
  nip: string;
  phone: string;
  mail: string;
  customerType: CustomerType;
  otherInfo: string;
  customerStatus: CustomerStatusType;
  regon: string;
  address: Address;
}

export interface Address {
  id: number;
  city: string;
  street: string;
  zip: string;
}
