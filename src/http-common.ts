import axios, { AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: "https://goahead.focikhome.synology.me/api",
  // baseURL: "http://localhost:8077/api",
  headers: {
    "Content-type": "application/json",
  },
});

export default apiClient;
