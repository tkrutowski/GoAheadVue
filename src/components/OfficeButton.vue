<template>
  <Button
    class="btn"
    :class="{
      ahead: btnType === 'ahead',
      'ahead-save': btnType === 'ahead-save',
    }"
    :disabled="btnDisabled"
  >
    {{ text }}
    <span
      v-if="isBusyIcon"
      class="spinner-border spinner-border-sm"
      role="status"
      aria-hidden="true"
    ></span>
    <span
      v-if="isErrorIcon"
      class="pi pi-times color-red"
      role="status"
      aria-hidden="true"
    ></span>
    <span
      v-if="isOkIcon"
      class="pi pi-check color-green"
      role="status"
      aria-hidden="true"
    ></span>
  </Button>
</template>

<script setup lang="ts">
import ButtonType from "@/types/ButtonType";

defineProps({
  btnType: {
    //dodanie typu
    type: String as () => ButtonType,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  btnDisabled: {
    type: Boolean,
    required: false,
  },
  isBusyIcon: {
    type: Boolean,
    required: false,
  },
  isErrorIcon: {
    type: Boolean,
    required: false,
  },
  isOkIcon: {
    type: Boolean,
    required: false,
  },
});
</script>

<style scoped>
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.ahead {
  background-color: var(--office-color);
  color: #332600 !important;
  border-color: var(--office-color) !important;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  font-weight: bold;
}

.ahead:hover {
  background-color: var(--office-color-hoover)!important;
}

.ahead:disabled {
  color: white !important;
  background-color: gray !important;
}

.ahead:focus {
  outline: none !important;
  box-shadow: none !important;
}

.ahead-save {
  display: block;
  width: 150px;
  background-color: rgba(220, 56, 72) !important;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgb(232, 230, 227) !important;
  border-color: rgb(38, 140, 115, 1) !important;
  font-weight: bold;
}

.ahead-save:hover {
  color: white !important;
  background-color: #ad1f2d !important;
}

.ahead-save:disabled {
  color: white !important;
  background-color: gray !important;
}

.ahead-save:focus {
  outline: none !important;
  box-shadow: none !important;
}
</style>
