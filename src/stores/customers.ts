import { defineStore } from "pinia";
import httpCommon from "@/http-common";
import { useAuthorizationStore } from "@/stores/authorization";
import { Customer } from "@/assets/types/Customer";
import CustomerStatusType from "@/assets/types/CustomerStatusType";
import { ErrorService } from "@/service/ErrorService";

export const useCustomerStore = defineStore("customer", {
  state: () => ({
    loginError: false,
    btnDisabled: false,
    busyIcon: false,
    loadingCustomer: false,
    customers: [] as Customer[],
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
    async getCustomersFromDb(customerStatus: CustomerStatusType) {
      console.log("START - getCustomersFromDb(" + customerStatus + ")");
      this.loadingCustomer = true;
      const authorization = useAuthorizationStore();
      const headers = {
        Authorization: "Bearer " + authorization.token,
      };
      try {
        if (this.customers.length === 0) {
          const response = await httpCommon.get(
            `/goahead/customer?status=` + customerStatus,
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
  },
});
