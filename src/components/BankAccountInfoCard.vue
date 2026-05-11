<script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps<{
    bankName?: string | null;
    accountNumber?: string | null;
  }>();

  const resolvedBankName = computed(() => props.bankName?.trim() || 'Brak danych z rejestru.');
  const resolvedAccountNumber = computed(() => props.accountNumber?.trim() || 'Brak danych z rejestru.');
  const labelClass = 'pb-1 pl-1 text-sm font-medium text-surface-700 dark:text-surface-300';
</script>

<template>
  <section class="rounded-2xl border border-surface-200 bg-white/80 p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900/40 sm:p-5">
    <div class="mb-4 flex items-center gap-2 text-lg font-semibold text-surface-900 dark:text-surface-50">
      <i class="pi pi-building-columns text-sm text-primary-500" />
      <span>Informacje o rachunku</span>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="flex min-w-0 flex-col">
        <label :class="labelClass">Bank</label>
        <InputText :model-value="resolvedBankName" class="w-full" readonly size="large" />
      </div>

      <div class="flex min-w-0 flex-col">
        <label :class="labelClass">Numer rachunku</label>
        <InputText :model-value="resolvedAccountNumber" class="w-full" readonly size="large" />
      </div>
    </div>
  </section>
</template>
