import axios, { type AxiosInstance } from "axios";
import { useAuthorizationStore } from "@/stores/authorization.ts";
import router from "@/router";

/** Timeout żądań (ms). Gdy EC2 jest wyłączony, requesty wiszą w pending – po tym czasie dostajemy błąd i przekierowanie na 503. */
const REQUEST_TIMEOUT_MS = 15000;

const apiClient: AxiosInstance = axios.create({
  // baseURL: "https://goahead.focikhome.synology.me/api",
  // baseURL: "http://localhost:8077/api",
    // baseURL: 'https://pxcm6vnuy9.execute-api.eu-central-1.amazonaws.com/prod/api',
  baseURL: 'https://api.homeoffice.focik.net/api',
  timeout: REQUEST_TIMEOUT_MS,
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

        // Serwer w ogóle nie odpowiedział (brak połączenia / timeout), nie 4xx/5xx – np. EC2 wyłączony
        else if (
            !error.response &&
            (error.code === 'ERR_NETWORK' ||
                error.code === 'ERR_CONNECTION_REFUSED' ||
                error.code === 'ECONNABORTED')
        ) {
            const intendedPath = router.currentRoute.value.fullPath;
            const isErrorPage = intendedPath.startsWith('/error');
            router.push({
                name: 'Error503',
                query: intendedPath && !isErrorPage ? { redirectTo: intendedPath } : undefined,
            });
        }
        // FORBIDDEN
        else if (error.response?.status === 403) {
            console.log('Forbidden (403)', error)
            router.push({
                name: 'Error403',
            })
        }

        return Promise.reject(error);
    }
);

export default apiClient;
