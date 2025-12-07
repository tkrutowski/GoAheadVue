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
  <Button
    class="icon-only"
    :icon="props.icon"
    :rounded="props.rounded"
    :class="{ isActive: active }"
    :disabled="props.btnDisabled"
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
}

.icon-only:disabled {
  color: white !important;
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
