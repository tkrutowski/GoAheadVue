<script setup lang="ts">
import OfficeButton from "@/components/OfficeButton.vue";

defineProps({
  msg: {
    type: String,
    required: true,
    default: "NO MESSAGE",
  },
  label: {
    type: String,
    required: false,
    default: "Zapisz",
  },
});
const emit = defineEmits<{
  (e: "save"): void;
  (e: "cancel"): void;
}>();

const save = () => {
  emit("save");
};

const cancel = () => {
  emit("cancel");
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
          btn-type="ahead"
          @click="cancel"
          @abort="cancel"
        ></OfficeButton>
        <OfficeButton
          :text="label"
          btn-type="ahead-save"
          @click="save"
        ></OfficeButton>
      </div>
    </template>
  </Dialog>
</template>

<style scoped></style>
