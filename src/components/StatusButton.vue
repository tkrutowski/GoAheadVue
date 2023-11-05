<script setup lang="ts">
import StatusType from "@/assets/types/StatusType";
defineProps({
  btnType: {
    //dodanie typu
    type: String as () => StatusType,
    required: true,
  },
  colorIcon: {
    type: String,
    required: false,
    default: "#2da687",
  },
});
</script>
<template>
  <Button
    text
    rounded
    size="small"
    class="my-button"
    :style="{ color: colorIcon }"
  >
    <i
      :class="{
        'pi pi-check-square': btnType === 'PAID' || 'ACTIVE',
        'pi pi-stop': btnType === 'TO_PAY' || 'INACTIVE',
      }"
    ></i>
  </Button>
</template>
<style scoped>
.my-button {
}
.my-button:hover {
  background-color: transparent !important;
  transform: scale(1.4);
}
</style>
