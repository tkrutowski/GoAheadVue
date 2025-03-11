<script setup lang="ts">
import type {ButtonType} from '@/types/ButtonType'

defineProps({
  btnType: {
    //dodanie typu
    type: String as () => ButtonType,
    required: true,
  },
  text: {
    type: String,
    required: false,
  },
  btnDisabled: {
    type: Boolean,
    required: false,
  },
  loading: {
    type: Boolean,
    required: false,
  },
})
</script>
<template>
  <Button
      type="button"
      class="disabled:bg-surface-500 hover:disabled:!bg-surface-500"
      :class="{
      'font-bold uppercase tracking-widest border bg-primary hover:!bg-primary-700 border-primary-900 hover:!border-primary-900':
        btnType === 'office-regular',
      'font-bold uppercase tracking-widest border bg-red-600 hover:!bg-red-800 border-red-900 hover:!border-red-900':
        btnType === 'office-save',
    }"
      :disabled="btnDisabled"
      :loading="loading"
      icon-pos="right"
      :label="text"
      size="small"
  >
  </Button>
</template>
<style scoped>
.office-regular {
  background-color: var(--office-color);
  color: #332600 !important;
  border-color: var(--office-color) !important;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: bold;
}

.office-regular:hover {
  background-color: var(--office-color-hoover) !important;
}

.office-regular:disabled {
  color: white !important;
  background-color: gray !important;
}

.office-regular:focus {
  outline: none !important;
  box-shadow: none !important;
}

.office-save {
  background-color: rgba(220, 56, 72, 0.7) !important;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: bold;
  color: rgb(232, 230, 227) !important;
  border-color: rgb(128, 123, 0, 1) !important;
}

.office-save:hover {
  color: white !important;
  background-color: rgba(220, 56, 72) !important;
}

.office-save:disabled {
  color: white !important;
  background-color: gray !important;
}

.office-save:focus {
  outline: none !important;
  box-shadow: none !important;
}
</style>
