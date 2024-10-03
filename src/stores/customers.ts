import { defineStore } from "pinia";
import httpCommon from "@/http-common";
import { Customer } from "@/types/Customer";
import { CustomerStatus } from "@/types/CustomerStatus";
import { ErrorService } from "@/service/ErrorService";
import { CustomerType } from "@/types/CustomerType";

export const useCustomerStore = defineStore("customer", {
  state: () => ({
    loginError: false,
    btnDisabled: false,
    busyIcon: false,
    loadingCustomer: false,
    loadingCustomerType: false,
    customers: [] as Customer[],
    customerTypes: [] as CustomerType[],
  }),

  //getters = computed
  getters: {
    getCustomerById(state) {
      return (id: number): Customer | undefined => {
        return state.customers.find((customer) => customer.id === id);
      };
    },
    getCustomerNames: (state) => {
      return state.customers.map(
        (customer) => customer.firstName + " " + customer.name
      );
    },
    getCustomerActive: (state) => state.customers.filter((c) => c.customerStatus.name==='ACTIVE'),
  },

  //actions = metody w komponentach
  actions: {
    //
    //GET CUSTOMER BY STATUS
    //
    async getCustomersFromDb(customerStatus: string, address: boolean) {
      console.log("START - getCustomersFromDb(" + customerStatus + ")");
      this.loadingCustomer = true;
      try {
        if (this.customers.length === 0) {
          const response = await httpCommon.get(
            `/goahead/customer?status=` +
              customerStatus +
              `&address=` +
              address);
          // JSON responses are automatically parsed.
          console.log("getCustomersFromDb() - size[]: " + response.data.length);
          this.customers = response.data;
        } else {
          console.log("getCustomersFromDb() - BEZ GET");
        }
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR getCustomersFromDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
      } finally {
        this.loadingCustomer = false;
        console.log("END - getCustomersFromDb(" + customerStatus + ")");
      }
    },

    //
    //GET  CUSTOMER FROM DB BY ID
    //
    async getCustomerFromDb(
      customerId: number,
      isAddress: boolean
    ): Promise<Customer | undefined> {
      console.log("START - getCustomerFromDb(" + customerId + ")");
      this.loadingCustomer = true;
      try {
        const response = await httpCommon.get(
          `/goahead/customer/` + customerId + `?isAddress=` + isAddress);
        return response.data;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR getCustomerFromDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
      } finally {
        this.loadingCustomer = false;
        console.log("END - getCustomerFromDb()");
      }
    },

    //
    //CHANGE CUSTOMER_STATUS
    //
    async updateCustomerStatusDb(customerId: number, status: CustomerStatus) {
      console.log("START - updateCustomerStatusDb()");
      try {
        await httpCommon.put(
          `/goahead/customer/customerstatus/` + customerId,
          { value: status.name });
        const customer = this.customers.find((item) => item.id === customerId);
        if (customer) {
          customer.customerStatus = status;
        }
        return true;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR updateCustomerStatusDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
        return false;
      } finally {
        console.log("END - updateCustomerStatusDb()");
      }
    },

    //
    //ADD CUSTOMER
    //
    async addCustomerDb(customer: Customer) {
      console.log("START - addCustomerDb()");
      try {
        const response = await httpCommon.post(`/goahead/customer`, customer);
        this.customers.push(response.data);
        return true;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR addCustomerDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
        return false;
      } finally {
        console.log("END - addCustomerDb()");
      }
    },

    //
    //UPDATE CUSTOMER
    //
    async updateCustomerDb(customer: Customer) {
      console.log("START - updateCustomerDb()");
      try {
        const response = await httpCommon.put(`/goahead/customer`, customer);
        const index = this.customers.findIndex(
          (item) => item.id === customer.id
        );
        if (index !== -1) this.customers.splice(index, 1, response.data);
        return true;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR updateCustomerDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
        return false;
      } finally {
        console.log("END - updateCustomerDb()");
      }
    },

    //
    //DELETE CUSTOMER
    //
    async deleteCustomerDb(customerId: number) {
      console.log("START - deleteCustomerDb()");
      try {
        await httpCommon.delete(`/goahead/customer/` + customerId);
        const index = this.customers.findIndex(
          (item) => item.id === customerId
        );
        if (index !== -1) this.customers.splice(index, 1);
        return true;
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR deleteCustomerDb(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
        return false;
      } finally {
        console.log("END - deleteCustomerDb()");
      }
    },

    //
    //GET CUSTOMER TYPE
    //
    async getCustomerType() {
      console.log("START - getCustomerType()");
      this.loadingCustomerType = true;
      try {
        if (this.customerTypes.length === 0) {
          const response = await httpCommon.get(
            `/goahead/customer/customertype`);
          this.customerTypes = response.data;
        } else {
          console.log("getCustomerType() - BEZ GET");
        }
      } catch (e) {
        if (ErrorService.isAxiosError(e)) {
          console.log("ERROR getCustomerType(): ", e);
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
      } finally {
        this.loadingCustomerType = false;
        console.log("END - getCustomerType()");
      }
    },
  },
});
