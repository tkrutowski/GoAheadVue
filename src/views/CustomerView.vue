<script setup lang="ts">
import {useCustomerStore} from "@/stores/customers";
import {useRoute, useRouter} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {type Customer, CustomerStatus, CustomerType} from "@/types/Customer";
import OfficeButton from "@/components/OfficeButton.vue";
import {useToast} from "primevue/usetoast";
import TheMenu from "@/components/TheMenu.vue";
import OfficeIconButton from "@/components/OfficeIconButton.vue";
import {UtilsService} from "@/service/UtilsService.ts";
import type {AxiosError} from "axios";

const customerStore = useCustomerStore();
const route = useRoute();
const router = useRouter();

const toast = useToast();
const customer = ref<Customer>({
  id: 0,
  name: "",
  firstName: "",
  nip: "",
  phone: "",
  mail: "",
  customerType: CustomerType.COMPANY,
  otherInfo: "",
  customerStatus: CustomerStatus.ACTIVE,
  regon: "",
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
  return (
      customerStore.loadingCustomer ||
      btnSaveDisabled.value
  );
});
//
//SAVE
//
function saveCustomer() {
  submitted.value = true;
  if (isEdit.value) {
    editCustomer();
  } else {
    newCustomer();
  }
}

//
//---------------------------------------------------------NEW CUSTOMER----------------------------------------------
//
async function newCustomer() {
  console.log("newCustomer()");
  if (!isValid()) {
    showError("Uzupełnij brakujące elementy");
  } else {
    btnSaveDisabled.value = true;
    await customerStore.addCustomerDb(customer.value).then(() => {
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail: "Zapisano klienta: " + getCustomerFullName.value,
        life: 3000,
      });
      setTimeout(() => {
        btnSaveDisabled.value = false
        router.push({name: "Customers"});
      }, 3000);
    }).catch((reason: AxiosError) => {
      toast.add({
        severity: "error",
        summary: "Błąd podczas dodawania klienta.",
        detail: (reason?.response?.data as { message: string }).message,
        life: 5000,
      });
    }).finally(() => {
      btnShowBusy.value = false;
    })
    submitted.value = false;
  }
}

//
//-----------------------------------------------------EDIT CUSTOMER------------------------------------------------
//
const isEdit = ref<boolean>(false);

async function editCustomer() {
  if (!isValid()) {
    showError("Uzupełnij brakujące elementy");
  } else {
    btnSaveDisabled.value = true;
    await customerStore.updateCustomerDb(customer.value)
        .then(()=>{
          toast.add({
            severity: "success",
            summary: "Potwierdzenie",
            detail: "Zaaktualizowano dane klienta: " + getCustomerFullName.value,
            life: 3000,
          });
          setTimeout(() => {
            router.push({name: "Customers"});
          }, 3000);
        }).catch((reason: AxiosError) => {
          toast.add({
            severity: "error",
            summary: "Błąd podczas edycji klienta.",
            detail: (reason?.response?.data as { message: string }).message,
            life: 5000,
          });
        });
  }
}

onMounted(async () => {
  console.log("onMounted EDIT", route.params);
  btnSaveDisabled.value = true;
  isEdit.value = route.params.isEdit === "true";
  if (!isEdit.value) {
    console.log("onMounted NEW CUSTOMER");
  } else {
    console.log("onMounted EDIT CUSTOMER");
    const customerId = Number(route.params.customerId as string);
    customerStore
        .getCustomerFromDb(customerId)
        .then((data) => {
          if (data) {
            customer.value = data;
          }
        })
        .catch((error) => {
          console.error("Błąd podczas pobierania klienta:", error);
        });
  }
  btnSaveDisabled.value = false;
});

//
//-----------------------------------------------------ERROR-------------------------------------------------------
//
const submitted = ref(false);

const showError = (msg: string) => {
  toast.add({
    severity: "error",
    summary: "Error Message",
    detail: msg,
    life: 5000,
  });
};
const getCustomerFullName = computed(() => {
  return customer.value?.firstName + " " + customer.value?.name;
});
const isCompanyType = computed(() => {
  return customer.value.customerType === CustomerType.COMPANY;
});
const isValid = () => {
  if (customer.value.customerType === CustomerType.CUSTOMER) {
    return (
        customer.value.customerType &&
        customer.value.firstName.length > 0 &&
        customer.value.name.length > 0 &&
        customer.value.address.street.length > 0 &&
        customer.value.address.zip.length > 0 &&
        customer.value.address.city.length > 0
    );
  } else if (customer.value.customerType === CustomerType.COMPANY) {
    return (
        customer.value.customerType &&
        customer.value.name.length > 0 &&
        customer.value.nip.length > 0 &&
        customer.value.address.street.length > 0 &&
        customer.value.address.zip.length > 0 &&
        customer.value.address.city.length > 0
    );
  } else return false;
};

const showErrorFirstName = () => {
  if (isCompanyType.value) return false;
  return submitted.value && customer.value.firstName.length <= 0;
};
const showErrorName = () => {
  return submitted.value && customer.value.name.length <= 0;
};
const showErrorNip = () => {
  const isTenDigits = /^\d{10}$/.test(customer.value.nip);
  if (isCompanyType.value) {
    return submitted.value && !isTenDigits;
  } else {
    return submitted.value && customer.value.nip.length > 0 && !isTenDigits;
  }
};
const showErrorRegon = () => {
  if (submitted.value && customer.value.regon.length > 0) {
    const isNineDigits = /^\d{9}$/.test(customer.value.regon);
    const isFourteenDigits = /^\d{14}$/.test(customer.value.regon);
    return !(isNineDigits || isFourteenDigits);
  } else {
    return false;
  }
};
const showErrorStreet = () => {
  return submitted.value && customer.value.address.street.length <= 0;
};

const showErrorZip = () => {
  if (submitted.value) {
    const {zip} = customer.value.address;
    return (
        !(/(^\d{2}-\d{3}$)/.test(zip) && zip.length <= 6) &&
        !(/(^\d{5})/.test(zip) && zip.length <= 5)
    );
  }
};
const showErrorCity = () => {
  return submitted.value && customer.value.address.city.length <= 0;
};
const showErrorMail = () => {
  if (submitted.value && customer.value.mail.length > 0) {
    return !customer.value.mail.includes("@");
  }
  return false;
};
const showErrorPhone = () => {
  if (submitted.value && customer.value.phone.length > 0) {
    return !/^[0-9]+$/.test(customer.value.phone);
  }
  return false;
};
</script>

<template>
  <TheMenu/>

  <div class="m-4 max-w-6xl mx-auto">
    <form
        class="col-12 col-md-9 col-xl-6 align-self-center"
        @submit.stop.prevent="saveCustomer"
    >
      <Panel>
        <template #header>
          <OfficeIconButton
              title="Powrót do listy klientów"
              class="text-primary-400"
              icon="pi pi-arrow-left"
              @click="() => router.push({ name: 'Customers' })"
          />
          <div class="w-full flex justify-center gap-4">
           <span class=" text-3xl font-bold text-surface-500 dark:text-surface-400">
              {{ isEdit ? `Edycja danych klienta` : "Nowy klient" }}
            </span>
            <div v-if="customerStore.loadingCustomer">
              <ProgressSpinner
                  class="ml-3"
                  style="width: 40px; height: 40px"
                  stroke-width="5"
              />
            </div>
          </div>
        </template>

        <!-- ROW-1   CUSTOMER TYPE-->
        <div class="grip flex-row mb-3">
          <div class="flex flex-col">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="input-customer">Typ klienta:</label>
            <Select
                id="input-customer"
                v-model="customer.customerType"
                :options="UtilsService.getCustomerTypeOption()"
                option-label="label"
                option-value="value"
                required
                size="large"
            />
          </div>
        </div>

        <!-- ROW-2  FIRST_NAME / NAME  -->
        <div class="flex-row flex gap-4">
          <div class="flex flex-col w-full">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="input">Imię</label>
            <InputText
                id="input"
                v-model="customer.firstName"
                class="border-green"
                :invalid="showErrorFirstName()"
                :disabled="isCompanyType"
                maxlength="40"
                size="large"
            />
            <small class="p-error">{{
                showErrorFirstName() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
          <div class="flex flex-col w-full">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="input">{{
                isCompanyType ? "Nazwa firmy" : "Nazwisko"
              }}</label>
            <InputText
                id="input"
                v-model="customer.name"
                maxlength="100"
                :invalid="showErrorName()"
                size="large"
            />
            <small class="p-error">{{
                showErrorName() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
        </div>

        <!-- ROW-3  NIP / REGON  -->
        <div class="flex-row flex gap-4">
          <div class="flex flex-col w-full">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="nip">NIP</label>
            <InputText
                id="nip"
                v-model="customer.nip"
                class="border-green"
                :invalid="showErrorNip()"
                maxlength="100"
                size="large"
            />
            <small class="p-error">{{
                showErrorNip() ? "Pole NIP musi mieć 10 znaków." : "&nbsp;"
              }}</small>
          </div>
          <!--              <div class="col-6">-->
          <div class="flex flex-col w-full">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="regon">Regon</label>
            <InputText
                id="regon"
                v-model="customer.regon"
                :invalid="showErrorRegon()"
                maxlength="100"
                :disabled="!isCompanyType"
                size="large"
            />
            <small class="p-error">{{
                showErrorRegon() ? "Pole musi mieć 10 lub 14 znaków." : "&nbsp;"
              }}</small>
          </div>
        </div>

        <!-- ROW-4  ADDRESS  -->
        <div class="flex-row flex gap-4">
          <div class="flex flex-col w-full">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="street">Ulica</label>
            <InputText
                id="street"
                v-model="customer.address.street"
                class="border-green"
                :invalid="showErrorStreet()"
                maxlength="100"
                size="large"
            />
            <small class="p-error">{{
                showErrorStreet() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
          <div class="flex flex-col w-full">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="zip">Kod</label>
            <InputText
                id="zip"
                v-model="customer.address.zip"
                maxlength="6"
                :invalid="showErrorZip()"
                size="large"
            />
            <small class="p-error">{{
                showErrorZip() ? "Format 61754 lub 61-754." : "&nbsp;"
              }}</small>
          </div>
          <div class="flex flex-col w-full">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="city">Miasto</label>
            <InputText
                id="city"
                v-model="customer.address.city"
                maxlength="100"
                :invalid="showErrorCity()"
                size="large"
            />
            <small class="p-error">{{
                showErrorCity() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
        </div>

        <!-- ROW-5  MAIL / PHONE  -->
        <div class="flex-row flex grid">
          <div class="flex flex-col">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="mail">E-mail</label>
            <InputText
                id="mail"
                v-model="customer.mail"
                class="border-green"
                :invalid="showErrorMail()"
                maxlength="100"
                size="large"
            />
            <small class="p-error">{{
                showErrorMail() ? "Niepoprawny format." : "&nbsp;"
              }}</small>
          </div>
          <div class="flex flex-col">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="phone">Telefon</label>
            <InputText
                id="phone"
                v-model="customer.phone"
                maxlength="15"
                :invalid="showErrorPhone()"
                size="large"
            />
            <small class="p-error">{{
                showErrorPhone() ? "Niepoprawny format." : "&nbsp;"
              }}</small>
          </div>
        </div>

        <!-- ROW-6  OTHER INFO  -->
        <div class="row">
          <div class="flex flex-col">
            <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="input">Dodatkowe informacje:</label>
            <Textarea v-model="customer.otherInfo" rows="4" cols="30"/>
          </div>
        </div>

        <!-- ROW-7  BTN SAVE -->
        <template #footer>
          <div class="flex justify-end py-6 bg-surface-100 dark:bg-surface-900 rounded-xl">
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
