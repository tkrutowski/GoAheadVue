<script setup lang="ts">
import {useCustomerStore} from "@/stores/customers";
import {useRoute} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {Customer} from "@/types/Customer";
import OfficeButton from "@/components/OfficeButton.vue";
import {useToast} from "primevue/usetoast";
import TheMenu from "@/components/TheMenu.vue";
import router from "@/router";
import {CustomerType} from "@/types/CustomerType";
import IconButton from "@/components/IconButton.vue";

const customerStore = useCustomerStore();
const route = useRoute();

const toast = useToast();
let selectedCustomerType = ref<CustomerType | undefined>();
const customer = ref<Customer>({
  id: 0,
  name: "",
  firstName: "",
  nip: "",
  phone: "",
  mail: "",
  customerType: undefined,
  otherInfo: "",
  customerStatus: {name: "ACTIVE", viewName: "Aktywny"},
  regon: "",
  address: {
    id: 0,
    city: "",
    street: "",
    zip: "",
  },
});

const btnSaveDisabled = ref<boolean>(false);
const btnShowError = ref<boolean>(false);
const btnShowBusy = ref<boolean>(false);
const btnShowOk = ref<boolean>(false);

const isSaveBtnDisabled = computed(() => {
  return (
      customerStore.loadingCustomerType ||
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
    btnShowError.value = true;
    setTimeout(() => (btnShowError.value = false), 5000);
  } else {
    btnSaveDisabled.value = true;

    await customerStore.addCustomerDb(customer.value).then(() => {
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail: "Zapisano klienta: " + getCustomerFullName.value,
        life: 3000,
      });
      btnShowOk.value = true;
      setTimeout(() => {
        router.push({name: "Customers"});
      }, 3000);
    }).catch(() => {
      toast.add({
        severity: "error",
        summary: "Błąd",
        detail: "Błąd podczas dodawania klienta.",
        life: 3000,
      });
      btnShowError.value = true;
    });

    btnSaveDisabled.value = false;
    btnShowBusy.value = false;
    submitted.value = false;
    setTimeout(() => {
      btnShowError.value = false;
      btnShowOk.value = false;
    }, 5000);
  }
}

//
//-----------------------------------------------------EDIT CUSTOMER------------------------------------------------
//
const isEdit = ref<boolean>(false);

async function editCustomer() {
  if (!isValid()) {
    showError("Uzupełnij brakujące elementy");
    btnShowError.value = true;
    setTimeout(() => (btnShowError.value = false), 5000);
  } else {
    btnSaveDisabled.value = true;
    const result: boolean = await customerStore.updateCustomerDb(
        customer.value
    );

    if (result) {
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail: "Zaaktualizowano dane klienta: " + getCustomerFullName.value,
        life: 3000,
      });
      btnShowOk.value = true;
      setTimeout(() => {
        router.push({name: "Customers"});
      }, 3000);
    } else btnShowError.value = true;

    // btnSaveDisabled.value = false;
    setTimeout(() => {
      btnShowError.value = false;
      btnShowOk.value = false;
      btnShowError.value = false;
    }, 5000);
  }
}

onMounted(() => {
  console.log("onMounted GET");
  btnSaveDisabled.value = true;
  customerStore.getCustomerType();
  btnSaveDisabled.value = false;
});

onMounted(async () => {
  console.log("onMounted EDIT", route.params);
  btnSaveDisabled.value = true;
  isEdit.value = route.params.isEdit === "true";
  if (isEdit.value === false) {
    console.log("onMounted NEW CUSTOMER");
  } else {
    console.log("onMounted EDIT CUSTOMER");
    const customerId = Number(route.params.customerId as string);
    customerStore
        .getCustomerFromDb(customerId, true)
        .then((data) => {
          if (data) {
            customer.value = data;
            selectedCustomerType.value = customer.value.customerType;
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
    life: 3000,
  });
};
const getCustomerFullName = computed(() => {
  return customer.value?.firstName + " " + customer.value?.name;
});
const isCompanyType = computed(() => {
  return selectedCustomerType.value?.name === "COMPANY";
});
const isValid = () => {
  if (selectedCustomerType.value?.name === "CUSTOMER") {
    return (
        customer.value.customerType &&
        customer.value.firstName.length > 0 &&
        customer.value.name.length > 0 &&
        customer.value.address.street.length > 0 &&
        customer.value.address.zip.length > 0 &&
        customer.value.address.city.length > 0
    );
  } else if (selectedCustomerType.value?.name === "COMPANY") {
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
const showErrorCustomerType = () => {
  return submitted.value && selectedCustomerType.value == undefined;
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
          <IconButton
              v-tooltip.right="{
              value: 'Powrót do listy klientów',
              showDelay: 500,
              hideDelay: 300,
              class: 'pl-2',
            }"
              icon="pi-fw pi-list"
              @click="() => router.push({ name: 'Customers' })"
          />
          <div class="w-full flex justify-center gap-4">
            <h2>
              {{ isEdit ? `Edycja danych klienta` : "Nowy klient" }}
            </h2>
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
        <div class="flex flex-row grid">
          <div class="flex flex-col">
            <label for="input-customer">Typ klienta:</label>
            <Dropdown
                id="input-customer"
                v-model="selectedCustomerType"
                :class="{ 'p-invalid': showErrorCustomerType() }"
                :options="customerStore.customerTypes"
                option-label="viewName"
                :onchange="
                (customer.customerType = selectedCustomerType
                  ? selectedCustomerType
                  : undefined)
              "
                required
            />
            <small class="p-error">{{
                showErrorCustomerType() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
          <div v-if="customerStore.loadingCustomerType" class="mt-4">
            <ProgressSpinner
                class="ml-2 mt-1"
                style="width: 40px; height: 40px"
                stroke-width="5"
            />
          </div>
        </div>

        <!-- ROW-2  FIRST_NAME / NAME  -->
        <div class="flex-row flex gap-4">
          <div class="flex flex-col w-full">
            <label for="input">Imię</label>
            <InputText
                id="input"
                v-model="customer.firstName"
                class="border-green"
                :class="{ 'p-invalid': showErrorFirstName() }"
                :disabled="isCompanyType"
                maxlength="40"
            />
            <small class="p-error">{{
                showErrorFirstName() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
          <div class="flex flex-col w-full">
            <label for="input">{{
                isCompanyType ? "Nazwa firmy" : "Nazwisko"
              }}</label>
            <InputText
                id="input"
                v-model="customer.name"
                maxlength="100"
                :class="{ 'p-invalid': showErrorName() }"
            />
            <small class="p-error">{{
                showErrorName() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
        </div>

        <!-- ROW-3  NIP / REGON  -->
        <div class="flex-row flex gap-4">
          <div class="flex flex-col w-full">
            <label for="nip">NIP</label>
            <InputText
                id="nip"
                v-model="customer.nip"
                class="border-green"
                :class="{ 'p-invalid': showErrorNip() }"
                maxlength="100"
            />
            <small class="p-error">{{
                showErrorNip() ? "Pole NIP musi mieć 10 znaków." : "&nbsp;"
              }}</small>
          </div>
          <!--              <div class="col-6">-->
          <div class="flex flex-col w-full">
            <label for="regon">Regon</label>
            <InputText
                id="regon"
                v-model="customer.regon"
                :class="{ 'p-invalid': showErrorRegon() }"
                maxlength="100"
                :disabled="!isCompanyType"
            />
            <small class="p-error">{{
                showErrorRegon() ? "Pole musi mieć 10 lub 14 znaków." : "&nbsp;"
              }}</small>
          </div>
        </div>

        <!-- ROW-4  ADDRESS  -->
        <div class="flex-row flex gap-4">
          <div class="flex flex-col w-full">
            <label for="street">Ulica</label>
            <InputText
                id="street"
                v-model="customer.address.street"
                class="border-green"
                :class="{ 'p-invalid': showErrorStreet() }"
                maxlength="100"
            />
            <small class="p-error">{{
                showErrorStreet() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
          <div class="flex flex-col w-full">
            <label for="zip">Kod</label>
            <InputText
                id="zip"
                v-model="customer.address.zip"
                maxlength="6"
                :class="{ 'p-invalid': showErrorZip() }"
            />
            <small class="p-error">{{
                showErrorZip() ? "Format 61754 lub 61-754." : "&nbsp;"
              }}</small>
          </div>
          <div class="flex flex-col w-full">
            <label for="city">Miasto</label>
            <InputText
                id="city"
                v-model="customer.address.city"
                maxlength="100"
                :class="{ 'p-invalid': showErrorCity() }"
            />
            <small class="p-error">{{
                showErrorCity() ? "Pole jest wymagane." : "&nbsp;"
              }}</small>
          </div>
        </div>

        <!-- ROW-5  MAIL / PHONE  -->
        <div class="flex-row flex grid">
          <div class="flex flex-col">
            <label for="mail">E-mail</label>
            <InputText
                id="mail"
                v-model="customer.mail"
                class="border-green"
                :class="{ 'p-invalid': showErrorMail() }"
                maxlength="100"
            />
            <small class="p-error">{{
                showErrorMail() ? "Niepoprawny format." : "&nbsp;"
              }}</small>
          </div>
          <div class="flex flex-col">
            <label for="phone">Telefon</label>
            <InputText
                id="phone"
                v-model="customer.phone"
                maxlength="15"
                :class="{ 'p-invalid': showErrorPhone() }"
            />
            <small class="p-error">{{
                showErrorPhone() ? "Niepoprawny format." : "&nbsp;"
              }}</small>
          </div>
        </div>

        <!-- ROW-6  OTHER INFO  -->
        <div class="row">
          <div class="flex flex-col">
            <label for="input">Dodatkowe informacje:</label>
            <Textarea v-model="customer.otherInfo" rows="4" cols="30"/>
          </div>
        </div>

        <!-- ROW-7  BTN SAVE -->
        <div class="flex mt-5 justify-center">
          <OfficeButton
              text="zapisz"
              btn-type="ahead-save"
              type="submit"
              :is-busy-icon="btnShowBusy"
              :is-error-icon="btnShowError"
              :is-ok-icon="btnShowOk"
              :btn-disabled="isSaveBtnDisabled"
          />
        </div>
      </Panel>
    </form>
  </div>
</template>

<style scoped></style>
