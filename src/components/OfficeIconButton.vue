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
  severity: {
    type: String,
    required: false,
    default: 'warn',
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
      class="icon-only border-0"
    :icon="props.icon"
    :rounded="props.rounded"
    outlined
    :class="{ isActive: active }"
    :severity="props.severity"
    :disabled="props.btnDisabled"
  >
  </Button>
</template>
<style scoped>
.icon-only {
  outline: none; /* Brak zarysu po kliknięciu */
  padding: 10px 20px; /* Padding wewnątrz przycisku */
  border-radius: 4px; /* Zaokrąglenie rogów przycisku */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Cień zewnętrzny dla efektu głębi */
  transition:
      box-shadow 0.3s ease,
      transform 0.3s ease; /* Animacja dla płynności */
}

.icon-only:disabled {
  color: white !important;
}

.icon-only:focus {
  outline: none !important;
  box-shadow: none !important;
}

.icon-only:hover {
  background-color: transparent !important;
  transform: scale(1.4);
  border: 0;
}
.isActive {
  /* Przykładowy styl dla efektu wciśniętego przycisku */
  background-color: #b35f00 !important;
  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.2);
  transform: translateY(2px);
  border: 2px solid #f90;
}
</style>
