<script setup lang="ts">
  import { computed } from 'vue';
  import OfficeButton from '@/components/OfficeButton.vue';
  import type { KsefDialogResult } from '@/utils/ksefJobResult';

  const visible = defineModel<boolean>('visible', { default: false });
  const dateFrom = defineModel<Date>('dateFrom', { required: true });
  const dateTo = defineModel<Date>('dateTo', { required: true });

  const props = withDefaults(
    defineProps<{
      header: string;
      submitLabel?: string;
      /** Trwa zadanie — blokuje pola i zamknięcie dialogu. */
      loading?: boolean;
      /** Wynik zadania; gdy ustawiony, dialog pokazuje komunikat i listę błędów zamiast wyboru dat. */
      result?: KsefDialogResult | null;
    }>(),
    { submitLabel: 'Wyszukaj', loading: false, result: null }
  );

  const emit = defineEmits<{
    (e: 'submit'): void;
  }>();

  const closable = computed(() => !props.loading);

  const close = () => {
    visible.value = false;
  };

  const resultClass = computed(() => {
    switch (props.result?.severity) {
      case 'success':
        return 'border-green-500 bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200';
      case 'warn':
        return 'border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200';
      default:
        return 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200';
    }
  });
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="header"
    class="w-full max-w-[min(96vw,520px)]"
    :dismissable-mask="closable"
    :closable="closable"
    :close-on-escape="closable"
  >
    <div class="flex min-h-0 flex-col gap-4">
      <div v-if="$slots.default" class="text-sm text-surface-700 dark:text-surface-300">
        <slot />
      </div>

      <div v-if="!result" class="grid gap-3 sm:grid-cols-2 sm:items-end">
        <div class="flex flex-col gap-1">
          <label for="ksef-from" class="pl-1 pb-1 text-sm text-surface-800 dark:text-surface-400">Okres od</label>
          <DatePicker id="ksef-from" v-model="dateFrom" date-format="yy-mm-dd" show-icon fluid :disabled="loading" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="ksef-to" class="pl-1 pb-1 text-sm text-surface-800 dark:text-surface-400">Okres do</label>
          <DatePicker id="ksef-to" v-model="dateTo" date-format="yy-mm-dd" show-icon fluid :disabled="loading" />
        </div>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div :class="['rounded border-l-4 px-3 py-2 text-sm', resultClass]" role="status">{{ result.message }}</div>
        <details v-if="result.errors.length" class="text-sm" open>
          <summary class="cursor-pointer select-none font-semibold">Błędy ({{ result.errors.length }})</summary>
          <ul class="mt-2 max-h-60 list-disc space-y-1 overflow-y-auto pl-5">
            <li v-for="(err, idx) in result.errors" :key="idx">
              <span v-if="err.label" class="font-mono">{{ err.label }}</span
              ><span v-if="err.label"> — </span>{{ err.message }}
            </li>
          </ul>
        </details>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-row justify-end gap-1">
        <template v-if="!result">
          <OfficeButton text="Anuluj" btn-type="office-regular" :btn-disabled="loading" @click="close" />
          <OfficeButton :text="submitLabel" btn-type="office-save" :loading="loading" :btn-disabled="loading" @click="emit('submit')" />
        </template>
        <OfficeButton v-else text="Zamknij" btn-type="office-regular" @click="close" />
      </div>
    </template>
  </Dialog>
</template>
