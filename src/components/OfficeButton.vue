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
      class="rounded-full px-5 py-1.5 bg-transparent  font-bold uppercase tracking-[0.15em] text-base transition-all duration-200 disabled:bg-surface-500 hover:disabled:!bg-surface-600"
      :class="{
      'border-2 hover:!bg-primary-100 border-primary-100 dark:border-primary-800 hover:!border-primary-900 hover:dark:!bg-primary-800 hover:text-surface-100 text-surface-400':
        btnType === 'office-regular',
      'border-2  hover:!bg-red-800 border-red-600 hover:!border-red-900 text-red-600 hover:text-surface-100':
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
