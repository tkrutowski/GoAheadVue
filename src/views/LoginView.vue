<script setup lang="ts">
import { useAuthorizationStore } from "@/stores/authorization";
import { onMounted, ref, watch } from "vue";
import OfficeButton from "@/components/OfficeButton.vue";
import router from "@/router";
import { useToast } from "primevue/usetoast";
import ProgressBar from "primevue/progressbar";
import { useEc2Control } from "@/composables/useEc2Control";
import { EC2_INSTANCE_ID } from "@/config/ec2";

const authorizationStore = useAuthorizationStore();
const toast = useToast();
const { ensureInstanceRunning } = useEc2Control();

const username = ref<string>("");
const password = ref<string>("");

type LoginPhase = "idle" | "checking" | "starting" | "waiting" | "waiting_app" | "logging_in";
const loginPhase = ref<LoginPhase>("idle");

const phaseMessage: Record<Exclude<LoginPhase, "idle">, string> = {
  checking: "Sprawdzam serwer…",
  starting: "Uruchamiam serwer…",
  waiting: "Oczekiwanie na uruchomienie (może zająć 1–2 min)…",
  waiting_app: "Czekam na gotowość aplikacji…",
  logging_in: "Logowanie…",
};

onMounted(() => {
  authorizationStore.loginError = null;
});

async function login() {
  loginPhase.value = "checking";
  authorizationStore.btnDisabled = true;

  try {
    await ensureInstanceRunning(EC2_INSTANCE_ID, {
      onPhase: (p) => {
        loginPhase.value = p;
      },
      waitForAppPing: async () => {
        await authorizationStore.testPing();
      },
    });

    loginPhase.value = "logging_in";
    const result = await authorizationStore.login(username.value, password.value);
    if (result) {
      goBack();
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nie udało się uruchomić serwera.";
    toast.add({
      severity: "error",
      summary: "Logowanie",
      detail: message,
      life: 5000,
    });
  } finally {
    loginPhase.value = "idle";
    authorizationStore.btnDisabled = false;
  }
}

watch(
    () => authorizationStore.loginError,
    (newValue) => {
      if (newValue) {
        console.log("watch",newValue);
        toast.add({
          severity: 'error',
          summary: 'Logowanie',
          detail: newValue,
          life: 5000,
        })
      }
    },
    { immediate: true },
)

function goBack(): void {
  let history: string[] | [] = JSON.parse(
    localStorage.getItem("navigationHistory") || "[]"
  );
  let lastAddress = history[history.length - 1];
  if (lastAddress && (lastAddress === "/error" || lastAddress === "/login")) {
    history = history.slice(-25);
    history = history.filter((item) => item !== lastAddress); // Usuń ostatnią odwiedzoną stronę
    localStorage.setItem("navigationHistory", JSON.stringify(history));
  }

  if (history.length > 0) router.replace(history[history.length - 1]);
  else router.replace("/");
}
</script>
<template>
  <!--  <div class="bg-office">-->
  <form class="login-form mb-5 mt-1 mt-md-5" @submit.prevent="login()">
    <h2 class="mb-5 color-green text-center">Logowanie</h2>

    <!-- USERNAME -->
    <FloatLabel class="">
      <InputText
          id="username"
          v-model="username"
          class="w-full"
          autocomplete="username"
          required
      />
      <label for="username">Login</label>
    </FloatLabel>

    <!-- PASSWORD -->
    <FloatLabel class="mt-9">
      <Password
          id="password"
          v-model="password"
          toggle-mask
          required
          class="w-full text-yellow-400"
          autocomplete="current-password"
          :input-style="{'width':'100%'}"
          :feedback="false"

      />
      <label for="password" class="w-full">Hasło</label>
    </FloatLabel>

    <!-- BUTTON -->
    <office-button
      text="zaloguj się"
      class="btn mt-3 mb-1"
      style="width: 100%"
      btn-type="office-regular"
      type="submit"
      :disabled="loginPhase !== 'idle' || authorizationStore.btnDisabled"
      :is-busy-icon="authorizationStore.busyIcon"
      >Zaloguj się
    </office-button>

    <!-- EC2 / login progress -->
    <div
      v-if="loginPhase !== 'idle'"
      class="mt-2 mb-2 w-full"
    >
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-1">
        {{ phaseMessage[loginPhase] }}
      </p>
      <ProgressBar mode="indeterminate" class="w-full" />
    </div>

    <p class="text-right mb-4">
      <router-link class="color-gray link" to="/forgot-password"
        >Nie pamiętam hasła</router-link
      >
    </p>
  </form>
</template>
<style scoped>

/* unvisited link */
.link:link {
  color: #a29a8e;
}

/* visited link */
.link:visited {
  color: #a29a8e;
}

/* mouse over link */
.link:hover {
  color: #268c73;
  text-decoration: none;
}

.login-form {
  max-width: 400px;
  margin: auto;
  margin-top: 200px;
}
</style>
