<script setup lang="ts">
import { onMounted, ref } from "vue";
import router from "@/router";
import { useRoute } from "vue-router";
import { useToast } from "primevue/usetoast";
import ProgressBar from "primevue/progressbar";
import { useEc2Control, type EnsureInstanceRunningPhase } from "@/composables/useEc2Control";
import { EC2_INSTANCE_ID } from "@/config/ec2";
import { useAuthorizationStore } from "@/stores/authorization";

const route = useRoute();
const toast = useToast();
const authStore = useAuthorizationStore();
const { ensureInstanceRunning } = useEc2Control();

type Phase = EnsureInstanceRunningPhase | "idle";
const phase = ref<Phase>("idle");

const phaseMessage: Record<EnsureInstanceRunningPhase, string> = {
  checking: "Sprawdzam serwer…",
  starting: "Uruchamiam serwer…",
  waiting: "Oczekiwanie na uruchomienie (może zająć 1–2 min)…",
  waiting_app: "Czekam na gotowość aplikacji…",
};

onMounted(async () => {
  phase.value = "checking";
  try {
    await ensureInstanceRunning(EC2_INSTANCE_ID, {
      onPhase: (p) => {
        phase.value = p;
      },
      waitForAppPing: async () => {
        await authStore.testPing();
      },
    });
    const redirectTo = route.query.redirectTo as string | undefined;
    if (redirectTo) {
      router.replace(redirectTo);
    } else {
      router.replace({ name: "Home" });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nie udało się uruchomić serwera.";
    toast.add({
      severity: "error",
      summary: "Serwer niedostępny",
      detail: message,
      life: 5000,
    });
    router.replace({ name: "Home" });
  } finally {
    phase.value = "idle";
  }
});
</script>

<template>
  <div class="mt-5 pt-5 text-center">
    <h2>Uruchamianie serwera…</h2>
    <div
      v-if="phase !== 'idle'"
      class="mt-4 mx-auto max-w-md px-4"
    >
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-1">
        {{ phaseMessage[phase] }}
      </p>
      <ProgressBar mode="indeterminate" class="w-full" />
    </div>
  </div>
</template>

<style scoped></style>
