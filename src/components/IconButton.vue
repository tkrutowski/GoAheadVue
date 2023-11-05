<script setup lang="ts">
const props = defineProps({
  icon: {
    type: String,
    required: false,
    default: "pi-file",
  },
  color: {
    type: String,
    required: false,
    default: "#268c73",
  },
  btnDisabled: {
    type: Boolean,
    required: false,
  },
});
</script>
<template>
  <Button text rounded size="large" class="my-button" :disabled="btnDisabled">
    <i class="pi" :class="props.icon" :style="{ color: props.color }"></i>
  </Button>
</template>
<style scoped>
.my-button {
  padding: 0 !important;
}
.my-button:hover {
  background-color: transparent !important;
  transform: scale(1.4);
  border: 0;
}
.my-button:disabled {
  color: gray !important;
}
</style>
