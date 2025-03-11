<script setup lang="ts">
import OfficeButton from "@/components/OfficeButton.vue";

defineProps({
  msg: {
    type: String,
    required: true,
    default: "NO MESSAGE",
  },
});
const emit = defineEmits<{
  (e: "cancel"): void;
}>();

const cancel = () => {
  emit("cancel");
};
</script>

<template>
  <Dialog :style="{ width: '550px' }" header="Informacja" :modal="true">
    <div class="confirmation-content">
      <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
      <span v-html="msg"></span>
    </div>
    <template #footer>
      <div class="flex flex-row gap-1 justify-content-end">
        <OfficeButton
          text="OK"
          btn-type="office-regular"
          @click="cancel"
          @abort="cancel"
        ></OfficeButton>
      </div>
    </template>
  </Dialog>
</template>

<style scoped></style>
