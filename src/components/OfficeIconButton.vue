<script setup lang="ts">
const props = defineProps({
  icon: {
    type: String,
    required: false,
    default: 'pi pi-file',
  },
  btnDisabled: {
    type: Boolean,
    required: false,
  },
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
  active: {
    type: Boolean,
    required: false,
    default: false,
  },
  rounded: {
    type: Boolean,
    required: false,
    default: true,
  },
})
</script>
<template>
  <span v-if="props.loading" class="loading-spinner-container">
    <i class="loading-spinner pi pi-spin pi-spinner"></i>
  </span>
  <Button v-else
    class="icon-only"
    :icon="props.icon"
    :rounded="props.rounded"
    :class="{ isActive: active }"
    :disabled="props.btnDisabled || props.loading"
    :loading="props.loading"
  >
  </Button>
</template>
<style scoped>
.icon-only {
  outline: none !important;
  border: none !important;
  padding: 10px 20px;
  border-radius: 4px;
  box-shadow: none !important;
  background: transparent !important;
  transition: none;
}

.icon-only :deep(.p-button-icon) {
  transition: transform 0.3s ease;
  font-size: 1.2rem;
}

.loading-spinner-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
}

.loading-spinner {
  font-size: 1.2rem;
  transform-origin: center center;
}

.icon-only:disabled {
  color: #53575e !important;
  opacity: 0.6;
}

.icon-only:disabled :deep(.p-button-icon) {
  color: #53575e !important;
}

.icon-only:focus {
  outline: none !important;
  box-shadow: none !important;
}

.icon-only:hover :deep(.p-button-icon) {
  transform: scale(1.4);
}

.isActive {
  background-color: #b35f00 !important;
  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.2);
  transform: translateY(2px);
  border: 2px solid #f90;
}
</style>
