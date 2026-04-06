<script setup lang="ts">
  import OfficeButton from '@/components/OfficeButton.vue';

  defineProps({
    msg: {
      type: String,
      required: true,
      default: 'NO MESSAGE',
    },
    label: {
      type: String,
      required: false,
      default: 'Zapisz',
    },
    /** Stan blokady przycisku „Zapisz” (ładowanie, podwójne kliknięcia). */
    saveLoading: {
      type: Boolean,
      default: false,
    },
  });
  const emit = defineEmits<{
    (e: 'save'): void;
    (e: 'cancel'): void;
  }>();

  const save = () => {
    emit('save');
  };

  const cancel = () => {
    emit('cancel');
  };
</script>

<template>
  <Dialog :style="{ width: '550px' }" header="Potwierdzenie" :modal="true">
    <div class="confirmation-content">
      <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
      <span v-html="msg"></span>
    </div>
    <template #footer>
      <div class="flex flex-row gap-1 justify-content-end">
        <OfficeButton
          text="Anuluj"
          btn-type="office-regular"
          :btn-disabled="saveLoading"
          @click="cancel"
          @abort="cancel"
        />
        <OfficeButton
          :text="label"
          btn-type="office-save"
          :loading="saveLoading"
          :btn-disabled="saveLoading"
          @click="save"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped></style>
