import { defineStore } from "pinia";
import User from "@/assets/types/User";
import httpCommon from "@/http-common";
import jwt_decode from "jwt-decode";
// import * as jwt_decode from 'jwt-decode';
export const useAuthorizationStore = defineStore("authorization", {
  state: () => ({
    token: "null",
    loginError: false,
    btnDisabled: false,
    isAuthenticated: false,
    busyIcon: false,
    user: {
      id: 0,
      username: "test",
      firstName: "Test",
    } as User,
    userPrivileges: [] as string[],
  }),

  //getters = computed
  getters: {
    hasAccessGoAhead(): boolean {
      console.log("hasAccessGoAhead()");
      try {
        // console.log("token : ", this.token);
        const decoded = jwt_decode(this.token);
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
    //
    //LOGIN
    //
    login(username: string, password: string) {
      console.log("START - login()");
      this.busyIcon = true;
      this.btnDisabled = true;
      httpCommon
        .post("/auth/login", {
          username: username,
          password: password,
        })
        .then((res) => {
          console.log("login() - SUCCESS");
          // console.log("data: " + JSON.stringify(res.headers));
          // console.log("header token: " + res.headers["jwt-token"]);

          if (!res.headers["jwt-token"] && res.status != 200) {
            console.log("START - loginFailed()");
            this.loginError = true;
            this.$reset();

            this.busyIcon = false;
            this.btnDisabled = false;
            return;
          }

          this.token = res.headers["jwt-token"];
          // console.log("token: " + this.token);
          this.isAuthenticated = true;
          this.user = res.data;

          this.busyIcon = false;
          this.btnDisabled = false;
          this.loginError = false;

          this.router.back(); // replace({name: 'home'});
        })
        .catch(async (e) => {
          console.log("login(e) - ERROR ", e);
          this.$reset();

          this.busyIcon = false;
          this.btnDisabled = false;
          this.loginError = true;
          console.log(this.loginError);
        });
    },
    //
    //LOGOUT
    //
    logout(): void {
      console.log("START - logout()");
      this.$reset(); //store reset
      this.router.replace({ name: "Home" });
    },
  },
});
