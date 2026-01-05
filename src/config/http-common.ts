import axios, { type AxiosInstance } from "axios";
import { useAuthorizationStore } from "@/stores/authorization.ts";
import router from "@/router";

const apiClient: AxiosInstance = axios.create({
  // baseURL: "https://goahead.focikhome.synology.me/api",
  // baseURL: "http://localhost:8077/api",
    // baseURL: 'https://pxcm6vnuy9.execute-api.eu-central-1.amazonaws.com/prod/api',
  baseURL: 'https://api.homeoffice.focik.net/api',
  headers: {
    "Content-type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (config.url?.endsWith("/login") || config.url?.endsWith("/refresh")) {
      console.log("Żądanie do /login, pomijanie nagłówka Authorization");
    } else {
      const authStore = useAuthorizationStore();
      if (authStore.accessToken) {
        config.headers.Authorization = `Bearer ${authStore.accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        console.log('ERROR interceptor: ', error);
        const authStore = useAuthorizationStore()

        if (error.response && error.response.status === 401) {
            console.log("Unauthorized - Sprawdzam refresh token...");
            const status = error.response.status;
            const message = error.response.data?.message;

            // 🛑 Obsługa błędnego logowania (niepoprawne dane logowania)
            if (status === 401 && message === "INVALID_CREDENTIALS") {
                console.log("Niepoprawne dane logowania!");
                authStore.setLoginError("Niepoprawny login lub hasło.");
                return Promise.reject(error);
            }

            // 🔄 Obsługa wygaśnięcia tokena
            if (error.response.data?.message === "REFRESH TOKEN EXPIRED") {
                console.log("Refresh token wygasł - wylogowanie...");
                authStore.logout();
                return Promise.reject(error);
            }

            try {
                const response = await authStore.refresh();
                if (response.status === 200) {
                    return apiClient(error.config); // Ponowne wysłanie oryginalnego żądania
                }
            } catch (err) {
                console.log("Błąd odświeżania tokena", err);
                authStore.logout();
            }
        }

        // SERVER OFFLINE
        else if (error.code == 'ERR_NETWORK' || error.code == 'ERR_CONNECTION_REFUSED') {
            console.log('NETWORK ERROR')
            router.push({
                name: 'Error503',
            })
        }
        //FORBIDDEN
        else if (error.code == 'ERR_BAD_REQUEST' && error.message.toString().includes('403')) {
            console.log('ERR_BAD_REQUEST', error)
            router.push({
                name: 'Error403',
            })
        }

        return Promise.reject(error);
    }
);

export default apiClient;
