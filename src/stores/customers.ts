import {defineStore} from "pinia";
import httpCommon from "@/config/http-common.ts";
import {type Customer, CustomerStatus} from "@/types/Customer.ts";

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
        getSortedCustomers: (state) => {
            return [...state.customers].sort((a: Customer, b: Customer) =>
                a.name.localeCompare(b.name)
            );
        },
        getCustomerNames: (state) => {
            return state.customers.map(
                (customer) => customer.firstName + " " + customer.name
            );
        },
        getCustomerActive: (state) => state.customers.filter((c) => c.customerStatus === CustomerStatus.ACTIVE),
    },

    //actions = metody w komponentach
    actions: {
        //
        //GET CUSTOMER BY STATUS
        //
        async getCustomersFromDb(customerStatus: string) {
            console.log("START - getCustomersFromDb(" + customerStatus + ")");
            this.loadingCustomer = true;
            const response = await httpCommon.get(
                `/goahead/customer?status=` +
                customerStatus)
                .finally(() => this.loadingCustomer = false);
            // JSON responses are automatically parsed.
            console.log("getCustomersFromDb() - size[]: " + response.data.length);
            this.customers = response.data;
            console.log('END - getCustomersFromDb()')
            return response.data
        },

        //
        //GET  CUSTOMER FROM DB BY ID
        //
        async getCustomerFromDb(customerId: number): Promise<Customer | null> {
            console.log("START - getCustomerFromDb(" + customerId + ")");
            this.loadingCustomer = true;
            const response = await httpCommon.get(
                `/goahead/customer/` + customerId);
            console.log("END - getCustomerFromDb()");
            this.loadingCustomer = false;
            return response.data || null
        },

        //
        //CHANGE CUSTOMER_STATUS
        //
        async updateCustomerStatusDb(customerId: number, status: CustomerStatus) {
            console.log("START - updateCustomerStatusDb()");
            await httpCommon.put(
                `/goahead/customer/customerstatus/` + customerId,
                {value: status});
            const customer = this.customers.find((item) => item.id === customerId);
            if (customer) {
                customer.customerStatus = status;
            }
            console.log("END - updateCustomerStatusDb()");
            return true;
        },

        //
        //ADD CUSTOMER
        //
        async addCustomerDb(customer: Customer) {
            console.log("START - addCustomerDb()");
            const response = await httpCommon.post(`/goahead/customer`, customer);
            this.customers.push(response.data);

        },

        //
        //UPDATE CUSTOMER
        //
        async updateCustomerDb(customer: Customer) {
            console.log("START - updateCustomerDb()");
            const response = await httpCommon.put(`/goahead/customer`, customer);
            const index = this.customers.findIndex(
                (item) => item.id === customer.id
            );
            if (index !== -1) this.customers.splice(index, 1, response.data);
            console.log("END - updateCustomerDb()");
        },

        //
        //DELETE CUSTOMER
        //
        async deleteCustomerDb(customerId: number) {
            console.log("START - deleteCustomerDb()");
            await httpCommon.delete(`/goahead/customer/` + customerId);
            const index = this.customers.findIndex(
                (item) => item.id === customerId
            );
            if (index !== -1) this.customers.splice(index, 1);
            console.log("END - deleteCustomerDb()");
        },
    },
});
