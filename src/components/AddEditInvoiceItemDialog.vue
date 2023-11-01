<script setup lang="ts">
import { ref, watch } from "vue";
import { InvoiceItem } from "@/assets/types/Invoice";
import { PropType } from "vue/dist/vue";
import OfficeButton from "@/components/OfficeButton.vue";

const emit = defineEmits<{
  (e: "save", newItem: InvoiceItem): void;
  (e: "cancel"): void;
}>();
const props = defineProps({
  item: {
    type: Object as PropType<InvoiceItem>,
    require: false,
    default: () => ({
      id: 0,
      idInvoice: 0,
      name: "",
      jm: "",
      quantity: 0,
      amount: 0,
    }),
    // default: new Invoice(),
  },
  isEdit: {
    type: Boolean,
    require: false,
    default: false,
  },
});
const newItem = ref<InvoiceItem>({ ...props.item });
const submitted = ref(false);

watch(
  () => props.item,
  (newVal) => {
    newItem.value = { ...newVal };
  }
);

const isValid = () => {
  return (
    newItem.value.amount &&
    newItem.value.jm &&
    newItem.value.name &&
    newItem.value.quantity
  );
};
const showErrorName = () => {
  return submitted.value && !newItem.value.name;
};
const showErrorJm = () => {
  return submitted.value && !newItem.value.jm;
};
const showErrorAmount = () => {
  return submitted.value && !newItem.value.amount;
};
const showErrorQuantity = () => {
  return submitted.value && !newItem.value.quantity;
};
const submit = () => {
  submitted.value = true;
  if (isValid()) {
    emit("save", newItem.value);
    submitted.value = false;
  }
};
const cancel = () => {
  emit("cancel");
};
</script>

<template>
  <Dialog modal class="p-fluid min-w-50vw" close-on-escape @abort="cancel">
    <template #header>
      <h4 class="color-green">
        {{ isEdit ? "Edytuj pozycję" : "Dodaj nową pozycję" }}
      </h4>
    </template>
    <div class="field mb-1">
      <label class="mb-0" for="name">Nazwa towaru/usługi:</label>
      <!-- NAME -->
      <InputText
        id="name"
        v-model.trim="newItem.name"
        :class="{ 'p-invalid': showErrorName() }"
        required="true"
        autofocus
        maxlength="150"
      />
      <small class="p-error">{{
        showErrorName() ? "Pole jest wymagane." : "&nbsp;"
      }}</small>
    </div>
    <!-- JM -->
    <div class="field mb-1">
      <label class="mb-0" for="jm">Jednostka miary:</label>
      <InputText
        id="jm"
        v-model.trim="newItem.jm"
        :class="{ 'p-invalid': showErrorJm() }"
        required="true"
        maxlength="10"
      />
      <small class="p-error">{{
        showErrorJm() ? "Pole jest wymagane." : "&nbsp;"
      }}</small>
    </div>
    <!-- QUANTITY -->
    <div class="field mb-1">
      <label class="mb-0" for="quantity">Ilość:</label>
      <InputNumber
        id="quantity"
        v-model.trim="newItem.quantity"
        :class="{ 'p-invalid': showErrorQuantity() }"
        required="true"
        :min-fraction-digits="0"
        :max-fraction-digits="2"
      />
      <small class="p-error">{{
        showErrorQuantity() ? "Pole jest wymagane." : "&nbsp;"
      }}</small>
    </div>
    <!-- AMOUNT -->
    <div class="field mb-1">
      <label class="mb-0" for="amount">Kwota:</label>
      <InputNumber
        id="amount"
        v-model="newItem.amount"
        :class="{ 'p-invalid': showErrorAmount() }"
        required="true"
        :min-fraction-digits="0"
        :max-fraction-digits="2"
      />
      <small class="p-error">{{
        showErrorAmount() ? "Pole jest wymagane." : "&nbsp;"
      }}</small>
    </div>
    <template #footer>
      <div class="flex flex-row justify-content-end">
        <OfficeButton text="Anuluj" btn-type="ahead" @click="cancel" />
        <OfficeButton text="Zapisz" btn-type="ahead-save" @click="submit" />
      </div>
    </template>
  </Dialog>
</template>
