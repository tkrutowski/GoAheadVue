import axios, { AxiosInstance } from "axios";
import { useAuthorizationStore } from "@/stores/authorization";

const apiClient: AxiosInstance = axios.create({
  baseURL: "https://goahead.focikhome.synology.me/api",
  // baseURL: "http://localhost:8077/api",
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

let refreshing = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const refreshToken: string | null =
      localStorage.getItem("refreshToken") || null;
    const authStore = useAuthorizationStore();
    if (
      !refreshing &&
      error.response &&
      error.response.status === 401 &&
      refreshToken
    ) {
      refreshing = true;
      const response = await authStore.refresh();
      if (response.status === 200 && response.data.accessToken) {
        refreshing = false;
        return apiClient(error.config);
      }
    } else if (
      error.response?.status === 401 &&
      error.response?.data?.message === "REFRESH TOKEN EXPIRED"
    ) {
      authStore.logout();
    }
    refreshing = false;
    return error;
  }
);

export default apiClient;
