import {defineStore} from "pinia";
import httpCommon from "@/config/http-common.ts";
import jwt_decode from "jwt-decode";
import moment from "moment";
import {useCustomerStore} from "@/stores/customers.ts";
import {useInvoiceStore} from "@/stores/invoices.ts";

export const useAuthorizationStore = defineStore("authorization", {
    state: () => ({
        accessToken: localStorage.getItem("accessToken") || null,
        refreshToken: localStorage.getItem("refreshToken") || null,
        loginError: null as string | null,
        btnDisabled: false,
        isAuthenticated: false,
        loading: false,
        busyIcon: false,
        username: localStorage.getItem("username") || "",
        userPrivileges: [] as string[],
    }),

    //getters = computed
    getters: {
        isAuthenticatedOrToken(): boolean {
            if (this.accessToken) {
                const decoded = jwt_decode(this.accessToken)
                return (
                    this.isAuthenticated || moment.unix(decoded.exp).isAfter(moment())
                );
            }
            return this.isAuthenticated;
        },
        hasAccessGoAhead(): boolean {
            console.log("hasAccessGoAhead()");
            try {
                // console.log("token : ", this.token);
                const decoded = jwt_decode(this.accessToken)
                // console.log("token decoded: ", decoded);
                return (
                    decoded.authorities.includes("ROLE_GOAHEAD") ||
                    decoded.authorities.includes("ROLE_ADMIN")
                );
            } catch (error) {
                console.log("hasAccessGoAhead() ERROR", error);
                return false;
            }
        },
    },

    //actions = metody w komponentach
    actions: {
        setLoginError(message: string) {
            this.loginError = message;
        },
        clearLoginError() {
            this.loginError = null;
        },

        logUser(token: string, refreshToken: string) {
            this.accessToken = token;
            localStorage.setItem("accessToken", token);
            this.isAuthenticated = true;
            const decoded = jwt_decode(this.accessToken);
            if (decoded.sub) {
                this.username = decoded.sub
                localStorage.setItem('username', decoded.sub)
            }

            this.refreshToken = refreshToken;
            localStorage.setItem("refreshToken", refreshToken);
            this.clearLoginError()
        },
        //
        //LOGIN
        //
        async login(username: string, password: string) {
            console.log("START - login()");
            this.loading = true;
            this.btnDisabled = true;
            const res = await httpCommon.post("/v1/auth/login", {
                username: username,
                password: password,
            });

            console.log("LOGIN", res);
            this.logUser(res.data.accessToken, res.data.refreshToken);

            this.loading = false;
            this.btnDisabled = false;
            this.clearLoginError()

            console.log("END - login()");
            return true;
        },
        //
        //LOGOUT
        //
        logout(): void {
            console.log("START - logout()");
            const customerStore = useCustomerStore();
            const invoiceStore = useInvoiceStore();
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("username");
            this.clearLoginError()
            this.$reset(); //store reset
            customerStore.customers = [];
            invoiceStore.invoices = [];
            // Przekierowanie obsługiwane przez komponent wywołujący
        },
        //
        //REFRESH
        //
        async refresh() {
            console.log("START - refresh()");
            const refreshToken = localStorage.getItem("refreshToken") || null;
            const response = await httpCommon.post("/v1/auth/refresh", {
                refreshToken: refreshToken,
            });
            if (response.status === 200) {
                console.log("refresh() - success - update tokens");
                this.logUser(response.data.accessToken, response.data.refreshToken);
            }
            console.log("END - refresh()");
            return response;
        },

        //
        // TEST PING
        //
        async testPing() {
            console.log('START - testPing()')
            return await httpCommon.get('/v1/auth/test')
        },
    },
});
