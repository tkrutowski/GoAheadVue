import { defineStore } from "pinia";
import httpCommon from "@/http-common";
import { useAuthorizationStore } from "@/stores/authorization";
import { Customer } from "@/assets/types/Customer";
import { CustomerStatus } from "@/assets/types/CustomerStatus";
import { ErrorService } from "@/service/ErrorService";
import { CustomerType } from "@/assets/types/CustomerType";

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
  },

  //actions = metody w komponentach
  actions: {
    //
    //GET CUSTOMER BY STATUS
    //
    async getCustomersFromDb(customerStatus: string, address: boolean) {
      console.log("START - getCustomersFromDb(" + customerStatus + ")");
      this.loadingCustomer = true;
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        if (this.customers.length === 0) {
          const response = await httpCommon.get(
            `/goahead/customer?status=` +
              customerStatus +
              `&address=` +
              address,
            {
              headers: authorization.token !== "null" ? headers : {},
            }
          );
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

      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        const response = await httpCommon.get(
          `/goahead/customer/` + customerId + `?isAddress=` + isAddress,
          {
            headers: authorization.token !== "null" ? headers : {},
          }
        );
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

      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        await httpCommon.put(
          `/goahead/customer/customerstatus/` + customerId,
          { value: status.name },
          {
            headers: authorization.token !== "null" ? headers : {},
          }
        );
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
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        const response = await httpCommon.post(`/goahead/customer`, customer, {
          headers: authorization.token !== "null" ? headers : {},
        });
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

      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        const response = await httpCommon.put(`/goahead/customer`, customer, {
          headers: authorization.token !== "null" ? headers : {},
        });
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
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        await httpCommon.delete(`/goahead/customer/` + customerId, {
          headers: authorization.token !== "null" ? headers : {},
        });
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
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        if (this.customerTypes.length === 0) {
          const response = await httpCommon.get(
            `/goahead/customer/customertype`,
            {
              headers: authorization.token !== "null" ? headers : {},
            }
          );
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
