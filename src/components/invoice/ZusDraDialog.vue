<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';
  import moment from 'moment';
  import { useToast } from 'primevue/usetoast';
  import OfficeButton from '@/components/OfficeButton.vue';
  import { useInvoiceStore } from '@/stores/invoices';
  import { useZusDraDialogStore } from '@/stores/zusDraDialog';
  import type { ZusDraDataDto } from '@/types/ZusDra';
  import { UtilsService } from '@/service/UtilsService';

  const zusDraDialogStore = useZusDraDialogStore();
  const { visible } = storeToRefs(zusDraDialogStore);

  const invoiceStore = useInvoiceStore();
  const toast = useToast();

  function firstDayOfCurrentMonth(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  }

  const settlementMonth = ref<Date>(firstDayOfCurrentMonth());
  const loading = ref(false);
  const result = ref<ZusDraDataDto | null>(null);
  const errorMessage = ref<string | null>(null);

  const netIncome = computed(() => {
    if (!result.value) return 0;
    return result.value.totalIncome - result.value.totalCosts;
  });

  function resetState() {
    settlementMonth.value = firstDayOfCurrentMonth();
    result.value = null;
    errorMessage.value = null;
    loading.value = false;
  }

  watch(visible, (isVisible) => {
    if (!isVisible) resetState();
  });

  async function calculate() {
    if (loading.value) return;

    result.value = null;
    errorMessage.value = null;
    loading.value = true;

    const settlementDate = moment(settlementMonth.value).startOf('month').format('YYYY-MM-DD');

    try {
      const fetchResult = await invoiceStore.calculateZusDra(settlementDate);
      if (!fetchResult.ok) {
        errorMessage.value = fetchResult.message;
        toast.add({
          severity: 'error',
          summary: 'ZUS DRA',
          detail: fetchResult.message,
          life: 6000,
        });
        return;
      }
      result.value = fetchResult.data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Nie udało się obliczyć ZUS DRA.';
      errorMessage.value = msg;
      toast.add({
        severity: 'error',
        summary: 'ZUS DRA',
        detail: msg,
        life: 6000,
      });
    } finally {
      loading.value = false;
    }
  }
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :modal="false"
    header="Oblicz ZUS DRA"
    class="zus-dra-dialog w-full max-w-[min(96vw,520px)]"
    :dismissable-mask="false"
    closable
    close-on-escape
    draggable
    position="topright"
  >
    <div class="flex min-h-0 flex-col gap-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <label for="zus-dra-month" class="pl-1 pb-1 text-sm text-surface-800 dark:text-surface-400"> Data rozliczenia </label>
          <DatePicker id="zus-dra-month" v-model="settlementMonth" view="month" date-format="mm/yy" show-icon fluid :disabled="loading" />
        </div>
        <OfficeButton
          text="Oblicz"
          btn-type="office-save"
          class="shrink-0 sm:mb-0.5"
          :loading="loading"
          :btn-disabled="loading"
          @click="calculate"
        />
      </div>

      <div v-if="loading" class="flex justify-center py-8">
        <ProgressSpinner class="h-12 w-12" stroke-width="4" />
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <div
        v-else-if="result"
        class="flex flex-col gap-2 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-sm dark:border-surface-700 dark:bg-surface-900"
      >
        <p>
          <span class="text-surface-600 dark:text-surface-400">Składka za:</span>
          <span class="ml-1 font-semibold text-surface-900 dark:text-surface-100">{{ result.period }}</span>
        </p>
        <p>
          <span class="text-surface-600 dark:text-surface-400">Przychód w miesiącu poprzedzającym:</span>
          <span class="ml-1 font-semibold text-surface-900 dark:text-surface-100">
            {{ UtilsService.formatCurrency(result.totalIncome) }}
          </span>
        </p>
        <p>
          <span class="text-surface-600 dark:text-surface-400">Koszty w miesiącu poprzedzającym:</span>
          <span class="ml-1 font-semibold text-surface-900 dark:text-surface-100">
            {{ UtilsService.formatCurrency(result.totalCosts) }}
          </span>
        </p>
        <p>
          <span class="text-surface-600 dark:text-surface-400">Dochód w miesiącu poprzedzającym:</span>
          <span class="ml-1 font-semibold text-surface-900 dark:text-surface-100">
            {{ UtilsService.formatCurrency(netIncome) }}
          </span>
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-row justify-end gap-1">
        <OfficeButton text="Zamknij" btn-type="office-regular" @click="zusDraDialogStore.close()" />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
  :deep(.zus-dra-dialog.p-dialog) {
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
  }
</style>
