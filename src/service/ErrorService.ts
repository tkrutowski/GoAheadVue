import { AxiosError } from "axios";
import router from "@/router";

export const ErrorService = {
  validateError(e: AxiosError) {
    console.log(
      "validating error: " +
        e.code +
        ", status: " +
        e.response?.status +
        ", message: " +
        e.message
    );

    if (e.response?.status === 401) {
      console.log("!!!401");
      router.push({
        name: "login",
      });
    } else if (e.response?.status === 503) {
      router.push({
        name: "Error503",
      });
    } else {
      // Jeśli nie wpadło w żaden warunek, rzuć wyjątek ponownie
      throw e;
    }
  },

  isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError;
  },
};
