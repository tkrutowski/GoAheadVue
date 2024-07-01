import { defineStore } from "pinia";
import httpCommon from "@/http-common";
import jwt_decode from "jwt-decode";
import moment from "moment";
import { ErrorService } from "@/service/ErrorService";

export const useAuthorizationStore = defineStore("authorization", {
  state: () => ({
    accessToken: localStorage.getItem("accessToken") || null,
    refreshToken: localStorage.getItem("refreshToken") || null,
    loginError: false,
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
        const decoded: any = jwt_decode(this.accessToken);
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
        const decoded = jwt_decode(this.accessToken);
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
    logUser(token: string, refreshToken: string) {
      this.accessToken = token;
      localStorage.setItem("accessToken", token);
      this.isAuthenticated = true;
      const decoded: any = jwt_decode(this.accessToken);
      this.username = decoded.sub;
      localStorage.setItem("username", decoded.sub);

      this.refreshToken = refreshToken;
      localStorage.setItem("refreshToken", refreshToken);
    },
    //
    //LOGIN
    //
    async login(username: string, password: string) {
      console.log("START - login()");
      this.loading = true;
      this.btnDisabled = true;
      try {
        const res = await httpCommon.post("/v1/auth/login", {
          username: username,
          password: password,
        });

        console.log("LOGIN", res);
        if (!res.data.accessToken && res.status != 200) {
          console.log("START - loginFailed()");
          this.loginError = true;
          this.$reset();

          this.loading = false;
          this.btnDisabled = false;
          return false;
        }

        this.logUser(res.data.accessToken, res.data.refreshToken);

        this.loading = false;
        this.btnDisabled = false;
        this.loginError = false;

        return true;
      } catch (e) {
        console.log("ERROR login(): ", e);
        this.$reset();
        this.loginError = true;
        if (ErrorService.isAxiosError(e)) {
          ErrorService.validateError(e);
        } else {
          console.log("An unexpected error occurred: ", e);
        }
      } finally {
        this.loading = false;
        this.btnDisabled = false;
        console.log("END - login()");
      }
    },
    //
    //LOGOUT
    //
    logout(): void {
      console.log("START - logout()");
      this.$reset(); //store reset
      this.router.replace({ name: "Home" });
    },
    //
    //REFRESH
    //
    async refresh() {
      console.log("START - refresh()");
      const refreshToken = localStorage.getItem("refreshToken") || null;
      try {
        const response = await httpCommon.post("/v1/auth/refresh", {
          refreshToken: refreshToken,
        });
        if (response.status === 200) {
          console.log("refresh() - success - update tokens");
          this.logUser(response.data.accessToken, response.data.refreshToken);
        }
        return response;
      } catch (e) {
        console.log("ERROR refresh(): ", e);
        this.logout();
        throw e;
      }
    },
  },
});
