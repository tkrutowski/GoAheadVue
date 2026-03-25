<script setup lang="ts">
import { useSupplierStore } from "@/stores/suppliers";
import { useCompanyLookupStore } from "@/stores/companyLookup";
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, ref } from "vue";
import { CustomerStatus } from "@/types/Customer";
import type { Supplier } from "@/types/Supplier";
import OfficeButton from "@/components/OfficeButton.vue";
import { useToast } from "primevue/usetoast";
import TheMenu from "@/components/TheMenu.vue";
import OfficeIconButton from "@/components/OfficeIconButton.vue";
import { UtilsService } from "@/service/UtilsService.ts";
import type { AxiosError } from "axios";

const supplierStore = useSupplierStore();
const companyLookupStore = useCompanyLookupStore();
const route = useRoute();
const router = useRouter();

const toast = useToast();
const supplier = ref<Supplier>({
  id: 0,
  name: "",
  nip: "",
  phone: "",
  mail: "",
  otherInfo: "",
  customerStatus: CustomerStatus.ACTIVE,
  accountNumber: "",
  address: {
    id: 0,
    city: "",
    street: "",
    zip: "",
  },
});

const btnSaveDisabled = ref<boolean>(false);
const btnShowBusy = ref<boolean>(false);

const isSaveBtnDisabled = computed(() => {
  return supplierStore.loadingSupplier || btnSaveDisabled.value;
});

function saveSupplier() {
  submitted.value = true;
  if (isEdit.value) {
    editSupplier();
  } else {
    newSupplier();
  }
}

async function newSupplier() {
  if (!isValid()) {
    showError("Uzupełnij brakujące elementy");
  } else {
    btnSaveDisabled.value = true;
    await supplierStore
      .addSupplierDb(supplier.value)
      .then(() => {
        toast.add({
          severity: "success",
          summary: "Potwierdzenie",
          detail: "Zapisano dostawcę: " + supplier.value.name,
          life: 3000,
        });
        setTimeout(() => {
          btnSaveDisabled.value = false;
          router.push({ name: "Suppliers" });
        }, 3000);
      })
      .catch((reason: AxiosError) => {
        toast.add({
          severity: "error",
          summary: "Błąd podczas dodawania dostawcy.",
          detail: (reason?.response?.data as { message: string }).message,
          life: 5000,
        });
        btnSaveDisabled.value = false;
      })
      .finally(() => {
        btnShowBusy.value = false;
      });
    submitted.value = false;
  }
}

const isEdit = ref<boolean>(false);

async function editSupplier() {
  if (!isValid()) {
    showError("Uzupełnij brakujące elementy");
  } else {
    btnSaveDisabled.value = true;
    await supplierStore
      .updateSupplierDb(supplier.value)
      .then(() => {
        toast.add({
          severity: "success",
          summary: "Potwierdzenie",
          detail: "Zaaktualizowano dane dostawcy: " + supplier.value.name,
          life: 3000,
        });
        setTimeout(() => {
          router.push({ name: "Suppliers" });
        }, 3000);
      })
      .catch((reason: AxiosError) => {
        toast.add({
          severity: "error",
          summary: "Błąd podczas edycji dostawcy.",
          detail: (reason?.response?.data as { message: string }).message,
          life: 5000,
        });
        btnSaveDisabled.value = false;
      });
  }
}

onMounted(async () => {
  btnSaveDisabled.value = true;
  isEdit.value = route.params.isEdit === "true";
  if (!isEdit.value) {
    /* nowy */
  } else {
    const supplierId = Number(route.params.supplierId as string);
    await supplierStore
      .getSupplierFromDb(supplierId)
      .then((data) => {
        if (data) {
          supplier.value = data;
        }
      })
      .catch((error) => {
        console.error("Błąd podczas pobierania dostawcy:", error);
      });
  }
  btnSaveDisabled.value = false;
});

const submitted = ref(false);

const showError = (msg: string) => {
  toast.add({
    severity: "error",
    summary: "Error Message",
    detail: msg,
    life: 5000,
  });
};

async function lookupSupplierByNip() {
  const digits = UtilsService.normalizeNipDigits(supplier.value.nip);
  if (digits.length !== 10) {
    showError("Podaj NIP jako 10 cyfr.");
    return;
  }
  try {
    const result = await companyLookupStore.lookupByNip(digits);
    supplier.value.nip = result.nip;
    supplier.value.name = result.name;
    supplier.value.address.street = result.street;
    supplier.value.address.zip = result.zip;
    supplier.value.address.city = result.city;
    toast.add({
      severity: "success",
      summary: "Potwierdzenie",
      detail: "Uzupełniono dane dostawcy na podstawie NIP.",
      life: 3000,
    });
  } catch (reason) {
    const err = reason as AxiosError;
    toast.add({
      severity: "error",
      summary: "Wyszukiwanie po NIP",
      detail:
        (err?.response?.data as { message?: string })?.message ??
        "Nie udało się pobrać danych.",
      life: 5000,
    });
  }
}

const isValid = () => {
  return (
    supplier.value.name.length > 0 &&
    /^\d{10}$/.test(supplier.value.nip) &&
    supplier.value.address.street.length > 0 &&
    supplier.value.address.zip.length > 0 &&
    supplier.value.address.city.length > 0
  );
};

const showErrorFirstName = () => {
  return submitted.value && supplier.value.name.length <= 0;
};
const showErrorNip = () => {
  const isTenDigits = /^\d{10}$/.test(supplier.value.nip);
  return submitted.value && !isTenDigits;
};
const showErrorStreet = () => {
  return submitted.value && supplier.value.address.street.length <= 0;
};

const showErrorZip = () => {
  if (submitted.value) {
    const { zip } = supplier.value.address;
    return (
      !(/(^\d{2}-\d{3}$)/.test(zip) && zip.length <= 6) &&
      !(/(^\d{5})/.test(zip) && zip.length <= 5)
    );
  }
  return false;
};
const showErrorCity = () => {
  return submitted.value && supplier.value.address.city.length <= 0;
};
const showErrorMail = () => {
  if (submitted.value && supplier.value.mail.length > 0) {
    return !supplier.value.mail.includes("@");
  }
  return false;
};
const showErrorPhone = () => {
  if (submitted.value && supplier.value.phone.length > 0) {
    return !/^[0-9]+$/.test(supplier.value.phone);
  }
  return false;
};
</script>

<template>
  <TheMenu />

  <div class="m-4 max-w-6xl mx-auto">
    <form
      class="col-12 col-md-9 col-xl-6 align-self-center"
      @submit.stop.prevent="saveSupplier"
    >
      <Panel>
        <template #header>
          <OfficeIconButton
            title="Powrót do listy dostawców"
            class="text-primary-400"
            icon="pi pi-arrow-left"
            @click="() => router.push({ name: 'Suppliers' })"
          />
          <div class="w-full flex justify-center gap-4">
            <span
              class="text-3xl font-bold text-surface-500 dark:text-surface-400"
            >
              {{ isEdit ? "Edycja danych dostawcy" : "Nowy dostawca" }}
            </span>
            <div v-if="supplierStore.loadingSupplier">
              <ProgressSpinner
                class="ml-3"
                style="width: 40px; height: 40px"
                stroke-width="5"
              />
            </div>
          </div>
        </template>

        <div class="flex flex-col gap-4 mb-3">
          <div class="flex flex-col w-full">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="supplier-name"
              >Nazwa dostawcy</label
            >
            <InputText
              id="supplier-name"
              v-model="supplier.name"
              class="border-green"
              :invalid="showErrorFirstName()"
              maxlength="100"
              size="large"
            />
            <small class="p-error">{{
              showErrorFirstName() ? "Pole jest wymagane." : "\u00A0"
            }}</small>
          </div>
        </div>

        <div class="flex flex-row flex-wrap gap-4">
          <div class="flex flex-col w-full min-w-[12rem] flex-1">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="nip"
              >NIP</label
            >
            <div class="flex flex-row flex-wrap gap-2 items-end">
              <InputText
                id="nip"
                v-model="supplier.nip"
                class="flex-1 min-w-[10rem] border-green"
                :invalid="showErrorNip()"
                maxlength="10"
                size="large"
              />
              <span
                class="inline-flex shrink-0 mb-0.5 items-center [&_.p-button-icon]:text-green-600 dark:[&_.p-button-icon]:text-green-600 [&_.loading-spinner]:text-green-600 dark:[&_.loading-spinner]:text-green-600"
                title="Wyszukaj firmę po NIP"
              >
                <OfficeIconButton
                  icon="pi pi-search"
                  :btn-disabled="companyLookupStore.loadingLookup"
                  :loading="companyLookupStore.loadingLookup"
                  @click="lookupSupplierByNip"
                />
              </span>
            </div>
            <small class="p-error">{{
              showErrorNip() ? "Pole NIP musi mieć 10 cyfr." : "\u00A0"
            }}</small>
          </div>
          <div class="flex flex-col w-full min-w-[12rem] flex-1">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="accountNumber"
              >Numer konta</label
            >
            <InputText
              id="accountNumber"
              v-model="supplier.accountNumber"
              maxlength="64"
              size="large"
            />
            <small class="p-error">&nbsp;</small>
          </div>
        </div>

        <div class="flex flex-row flex-wrap gap-4 mt-2">
          <div class="flex flex-col w-full min-w-[10rem] flex-1">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="street"
              >Ulica</label
            >
            <InputText
              id="street"
              v-model="supplier.address.street"
              class="border-green"
              :invalid="showErrorStreet()"
              maxlength="100"
              size="large"
            />
            <small class="p-error">{{
              showErrorStreet() ? "Pole jest wymagane." : "\u00A0"
            }}</small>
          </div>
          <div class="flex flex-col w-full min-w-[8rem] max-w-[10rem]">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="zip"
              >Kod</label
            >
            <InputText
              id="zip"
              v-model="supplier.address.zip"
              maxlength="6"
              :invalid="showErrorZip()"
              size="large"
            />
            <small class="p-error">{{
              showErrorZip() ? "Format 61754 lub 61-754." : "\u00A0"
            }}</small>
          </div>
          <div class="flex flex-col w-full min-w-[10rem] flex-1">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="city"
              >Miasto</label
            >
            <InputText
              id="city"
              v-model="supplier.address.city"
              maxlength="100"
              :invalid="showErrorCity()"
              size="large"
            />
            <small class="p-error">{{
              showErrorCity() ? "Pole jest wymagane." : "\u00A0"
            }}</small>
          </div>
        </div>

        <div
          class="flex flex-col sm:flex-row gap-4 mt-4 w-full"
        >
          <div class="flex flex-col flex-1">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="mail"
              >E-mail</label
            >
            <InputText
              id="mail"
              v-model="supplier.mail"
              class="border-green"
              :invalid="showErrorMail()"
              maxlength="100"
              size="large"
            />
            <small class="p-error">{{
              showErrorMail() ? "Niepoprawny format." : "\u00A0"
            }}</small>
          </div>
          <div class="flex flex-col flex-1">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="phone"
              >Telefon</label
            >
            <InputText
              id="phone"
              v-model="supplier.phone"
              maxlength="15"
              :invalid="showErrorPhone()"
              size="large"
            />
            <small class="p-error">{{
              showErrorPhone() ? "Niepoprawny format." : "\u00A0"
            }}</small>
          </div>
        </div>

        <div class="row mt-4">
          <div class="flex flex-col w-full">
            <label
              class="pl-1 pb-1 text-surface-800 dark:text-surface-400"
              for="otherInfo"
              >Dodatkowe informacje:</label
            >
            <Textarea id="otherInfo" v-model="supplier.otherInfo" rows="4" cols="30" />
          </div>
        </div>

        <template #footer>
          <div
            class="flex justify-end py-6 bg-surface-100 dark:bg-surface-900 rounded-xl"
          >
            <OfficeButton
              text="zapisz"
              class="mr-6"
              btn-type="office-save"
              type="submit"
              :loading="btnShowBusy"
              :btn-disabled="isSaveBtnDisabled"
            />
          </div>
        </template>
      </Panel>
    </form>
  </div>
</template>

<style scoped>
:deep(.p-panel) {
  @apply dark:bg-surface-800;
}
</style>
