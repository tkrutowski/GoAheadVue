
export interface Customer {
  id: number;
  name: string;
  firstName: string;
  nip: string;
  phone: string;
  mail: string;
  customerType: CustomerType;
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


export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum CustomerType {
  CUSTOMER = "CUSTOMER",
  COMPANY = "COMPANY",
}