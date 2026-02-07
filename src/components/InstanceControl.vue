<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
  import { useRoute } from 'vue-router';
  import { useEc2Control } from '@/composables/useEc2Control';
  import { useToast } from 'primevue/usetoast';
  import OfficeIconButton from "@/components/OfficeIconButton.vue";

  /** Odświeżanie statusu EC2 co N minut (AWS wyłącza po 15 min bezczynności). 20 min żeby zapytanie nie „budziło” EC2. */
  const STATUS_POLL_INTERVAL_MS = 20 * 60 * 1000;

  const props = defineProps<{
    idInstance: string;
    nameInstance: string;
  }>();

  const route = useRoute();
  const { loading, getInstanceStatus, startInstance, stopInstance } = useEc2Control();
  const toast = useToast();

  const status = ref<'running' | 'stopped' | 'pending' | 'error' | null>(null);

  async function fetchStatus() {
    try {
      const data = await getInstanceStatus(props.idInstance);
      console.log('fetchStatus response:', data);
      // API zwraca status w polu 'state'
      const stateValue = data.state || data.status;
      if (stateValue) {
        // Normalizujemy wartość do lowercase
        status.value = stateValue.toLowerCase() as 'running' | 'stopped' | 'pending';
      } else {
        status.value = null;
      }
      console.log('Parsed status:', status.value);
    } catch (err) {
      console.error('fetchStatus error', err);
      toast.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się pobrać statusu instancji',
        life: 5000,
      });
    }
  }

  async function handleToggle() {
    // Zapamiętujemy poprzedni status przed zmianą
    const previousStatus = status.value;

    try {
      // Ustawiamy status na pending (żółty) podczas operacji
      status.value = 'pending';

      if (previousStatus === 'stopped' || previousStatus === null) {
        // Poprzedni status był stopped lub null, więc uruchamiamy
        await startInstance(props.idInstance);
        // Po sukcesie ustawiamy na running (zielony)
        status.value = 'running';
        // Odśwież status po dłuższej chwili aby zweryfikować rzeczywisty status
        setTimeout(async () => {
          await fetchStatus();
        }, 5000);
      } else if (previousStatus === 'running') {
        // Poprzedni status był running, więc zatrzymujemy
        await stopInstance(props.idInstance);
        // Po sukcesie ustawiamy na stopped (szary)
        status.value = 'stopped';
        toast.add({
          severity: 'success',
          summary: 'Sukces',
          detail: 'Instancja została zatrzymana',
          life: 3000,
        });
        // Odśwież status po dłuższej chwili aby zweryfikować rzeczywisty status
        setTimeout(async () => {
          await fetchStatus();
        }, 5000);
      }
    } catch (err) {
      status.value = 'error';
      toast.add({
        severity: 'error',
        summary: 'Błąd',
        detail: err instanceof Error ? err.message : 'Wystąpił błąd podczas operacji',
        life: 5000,
      });
      setTimeout(async () => {
        await fetchStatus();
      }, 3000);
    }
  }

  const buttonTitle = computed(() => {
    if (status.value === 'running') {
      return `Naciśnij aby wyłączyć EC2 ${props.nameInstance}`;
    }
    if (status.value === 'stopped') {
      return `Naciśnij aby uruchomić EC2 ${props.nameInstance}`;
    }
    // stopped lub null
    return `EC2 ${props.nameInstance}`;
  });

  const buttonIconColor = computed(() => {
    if (status.value === 'running') {
      return 'text-green-800 dark:text-green-400';
    }
    if (status.value === 'pending' || loading.value) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    if (status.value === 'error') {
      return 'text-red-600 dark:text-red-400';
    }
    // stopped lub null
    return 'text-orange-600 dark:text-orange-400';
  });

  let statusPollTimer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    fetchStatus();
    statusPollTimer = setInterval(() => {
      fetchStatus();
    }, STATUS_POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (statusPollTimer) {
      clearInterval(statusPollTimer);
      statusPollTimer = null;
    }
  });

  // Po przekierowaniu (np. z Error503 po uruchomieniu EC2) odśwież ikonę
  watch(() => route.fullPath, () => {
    fetchStatus();
  });
</script>

<template>
  <OfficeIconButton
    :title="buttonTitle"
    icon="pi pi-server"
    :class="buttonIconColor"
    :loading="loading"
    @click="handleToggle"
  />
</template>
