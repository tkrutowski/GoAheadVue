<script setup lang="ts">
  import { ref, watch } from 'vue';
  import { useSupplierStore } from '@/stores/suppliers';
  import type { Supplier } from '@/types/Supplier';
  import OfficeButton from '@/components/OfficeButton.vue';
  import SupplierFormCore from '@/components/supplier/SupplierFormCore.vue';
  import { ActiveStatus } from '@/types/Customer';
  import { createEmptySupplier, useSupplierForm } from '@/composables/useSupplierForm';
  import { UtilsService } from '@/service/UtilsService.ts';
  import { useToast } from 'primevue/usetoast';
  import type { AxiosError } from 'axios';

  const visible = defineModel<boolean>('visible', { default: false });

  const props = withDefaults(
    defineProps<{
      initialSupplier?: Partial<Supplier> | null;
      confirmLabel?: string;
      header?: string;
    }>(),
    {
      initialSupplier: null,
      confirmLabel: 'zapisz',
      header: 'Nowy dostawca',
    }
  );

  const emit = defineEmits<{
    saved: [supplier: Supplier];
  }>();

  const supplierStore = useSupplierStore();
  const toast = useToast();

  const supplier = ref<Supplier>(createEmptySupplier());
  const submitted = ref(false);
  const btnSaveDisabled = ref(false);
  const btnShowBusy = ref(false);

  const { isValid, showFormError } = useSupplierForm(supplier, submitted);

  function mergeInitialSupplier(initial: Partial<Supplier>): Supplier {
    const base = createEmptySupplier();
    const addr = initial.address;
    return {
      ...base,
      ...initial,
      id: 0,
      status: ActiveStatus.ACTIVE,
      nip: initial.nip ? UtilsService.normalizeNipDigits(String(initial.nip)) : base.nip,
      address: {
        ...base.address,
        ...(addr ?? {}),
        id: 0,
      },
    };
  }

  function resetForm() {
    supplier.value = createEmptySupplier();
    submitted.value = false;
    btnSaveDisabled.value = false;
    btnShowBusy.value = false;
  }

  function applyFormOnOpen() {
    if (props.initialSupplier) {
      supplier.value = mergeInitialSupplier(props.initialSupplier);
      submitted.value = false;
      btnSaveDisabled.value = false;
      btnShowBusy.value = false;
    } else {
      resetForm();
    }
  }

  watch(visible, (isVisible) => {
    if (isVisible) {
      applyFormOnOpen();
    }
  });

  function closeDialog() {
    visible.value = false;
  }

  async function saveSupplier() {
    submitted.value = true;
    if (!isValid()) {
      showFormError('Uzupełnij brakujące elementy');
      return;
    }

    btnSaveDisabled.value = true;
    btnShowBusy.value = true;

    try {
      const saved = await supplierStore.addSupplierDb(supplier.value);
      toast.add({
        severity: 'success',
        summary: 'Potwierdzenie',
        detail: 'Zapisano dostawcę: ' + saved.name,
        life: 3000,
      });
      emit('saved', saved);
      closeDialog();
    } catch (reason) {
      toast.add({
        severity: 'error',
        summary: 'Błąd podczas dodawania dostawcy.',
        detail: (reason as AxiosError<{ message: string }>)?.response?.data?.message ?? 'Nie udało się zapisać dostawcy.',
        life: 5000,
      });
      btnSaveDisabled.value = false;
    } finally {
      btnShowBusy.value = false;
    }
  }
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="header"
    modal
    :style="{ width: 'min(42rem, 95vw)' }"
    :content-style="{ maxHeight: '85vh', overflowY: 'auto' }"
    @hide="resetForm"
  >
    <form class="flex flex-col gap-4" @submit.stop.prevent="saveSupplier">
      <SupplierFormCore v-model:supplier="supplier" v-model:submitted="submitted" id-prefix="supplier-dialog" />

      <div class="flex justify-end gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
        <OfficeButton text="anuluj" btn-type="office-regular" type="button" @click="closeDialog" />
        <OfficeButton
          :text="confirmLabel"
          btn-type="office-save"
          type="submit"
          :loading="btnShowBusy"
          :btn-disabled="btnSaveDisabled || supplierStore.loadingSupplier"
        />
      </div>
    </form>
  </Dialog>
</template>
