<script setup lang="ts">
  import { useCustomerStore } from '@/stores/customers';
  import { useCompanyLookupStore } from '@/stores/companyLookup';
  import { useRoute, useRouter } from 'vue-router';
  import { computed, onMounted, ref } from 'vue';
  import { type Customer, ActiveStatus, CustomerType } from '@/types/Customer';
  import OfficeButton from '@/components/OfficeButton.vue';
  import { useToast } from 'primevue/usetoast';
  import TheMenu from '@/components/TheMenu.vue';
  import OfficeIconButton from '@/components/OfficeIconButton.vue';
  import { UtilsService } from '@/service/UtilsService.ts';
  import type { AxiosError } from 'axios';

  const customerStore = useCustomerStore();
  const companyLookupStore = useCompanyLookupStore();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const sectionClass =
    'rounded-2xl border border-surface-200 bg-white/80 p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900/40 sm:p-5';
  const sectionTitleClass = 'flex items-center gap-2 text-lg font-semibold text-surface-900 dark:text-surface-50';
  const labelClass = 'pb-1 pl-1 text-sm font-medium text-surface-700 dark:text-surface-300';
  const helperClass = 'min-h-5 pl-1 text-xs text-red-500';
  const inputClass = 'w-full';

  const customer = ref<Customer>({
    id: 0,
    name: '',
    firstName: '',
    nip: '',
    phone: '',
    mail: '',
    customerType: CustomerType.COMPANY,
    otherInfo: '',
    activeStatus: ActiveStatus.ACTIVE,
    regon: '',
    address: {
      id: 0,
      city: '',
      street: '',
      zip: '',
    },
  });

  const btnSaveDisabled = ref(false);
  const btnShowBusy = ref(false);
  const submitted = ref(false);
  const isEdit = ref(false);

  const isSaveBtnDisabled = computed(() => customerStore.loadingCustomer || btnSaveDisabled.value);
  const isCompanyType = computed(() => customer.value.customerType === CustomerType.COMPANY);
  const customerNameLabel = computed(() => (isCompanyType.value ? 'Nazwa firmy' : 'Nazwisko'));
  const customerTitle = computed(() => (isEdit.value ? 'Edycja danych klienta' : 'Nowy klient'));
  const customerLookupHint = computed(() =>
    isCompanyType.value
      ? 'Wpisz NIP i wybierz Szukaj, aby uzupełnić nazwę oraz adres firmy.'
      : 'Dla typu osoba wyszukiwanie GUS pozostaje wyłączone, ale możesz wpisać NIP ręcznie.'
  );
  const getCustomerFullName = computed(() => `${customer.value?.firstName ?? ''} ${customer.value?.name ?? ''}`.trim());

  function updateCustomerNip(value: string | number | undefined | null) {
    customer.value.nip = UtilsService.normalizeNipDigits(String(value ?? ''));
  }

  function handleCustomerNipPaste(event: ClipboardEvent) {
    event.preventDefault();
    updateCustomerNip(event.clipboardData?.getData('text') ?? '');
  }

  function saveCustomer() {
    submitted.value = true;
    if (isEdit.value) {
      void editCustomer();
    } else {
      void newCustomer();
    }
  }

  async function newCustomer() {
    if (!isValid()) {
      showError('Uzupełnij brakujące elementy');
      return;
    }

    btnSaveDisabled.value = true;
    btnShowBusy.value = true;

    await customerStore
      .addCustomerDb(customer.value)
      .then(() => {
        toast.add({
          severity: 'success',
          summary: 'Potwierdzenie',
          detail: 'Zapisano klienta: ' + getCustomerFullName.value,
          life: 3000,
        });
        submitted.value = false;
        setTimeout(() => {
          btnSaveDisabled.value = false;
          router.push({ name: 'Customers' });
        }, 3000);
      })
      .catch((reason: AxiosError) => {
        toast.add({
          severity: 'error',
          summary: 'Błąd podczas dodawania klienta.',
          detail: (reason?.response?.data as { message: string }).message,
          life: 5000,
        });
        btnSaveDisabled.value = false;
      })
      .finally(() => {
        btnShowBusy.value = false;
      });
  }

  async function editCustomer() {
    if (!isValid()) {
      showError('Uzupełnij brakujące elementy');
      return;
    }

    btnSaveDisabled.value = true;
    btnShowBusy.value = true;

    await customerStore
      .updateCustomerDb(customer.value)
      .then(() => {
        toast.add({
          severity: 'success',
          summary: 'Potwierdzenie',
          detail: 'Zaaktualizowano dane klienta: ' + getCustomerFullName.value,
          life: 3000,
        });
        setTimeout(() => {
          router.push({ name: 'Customers' });
        }, 3000);
      })
      .catch((reason: AxiosError) => {
        toast.add({
          severity: 'error',
          summary: 'Błąd podczas edycji klienta.',
          detail: (reason?.response?.data as { message: string }).message,
          life: 5000,
        });
        btnSaveDisabled.value = false;
      })
      .finally(() => {
        btnShowBusy.value = false;
      });
  }

  onMounted(async () => {
    btnSaveDisabled.value = true;
    isEdit.value = route.params.isEdit === 'true';

    if (isEdit.value) {
      const customerId = Number(route.params.customerId as string);
      await customerStore
        .getCustomerFromDb(customerId)
        .then((data) => {
          if (data) {
            customer.value = data;
            customer.value.nip = UtilsService.normalizeNipDigits(customer.value.nip);
          }
        })
        .catch((error) => {
          console.error('Błąd podczas pobierania klienta:', error);
        });
    }

    btnSaveDisabled.value = false;
  });

  const showError = (msg: string) => {
    toast.add({
      severity: 'error',
      summary: 'Error Message',
      detail: msg,
      life: 5000,
    });
  };

  async function lookupCompanyByNip() {
    if (!isCompanyType.value) {
      showError('Wyszukiwanie jest dostępne dla typu firma.');
      return;
    }

    const digits = UtilsService.normalizeNipDigits(customer.value.nip);
    if (digits.length !== 10) {
      showError('Podaj NIP jako 10 cyfr.');
      return;
    }

    try {
      const result = await companyLookupStore.lookupByNip(digits);
      const addr = result.addressDto;

      customer.value.nip = UtilsService.normalizeNipDigits(result.nip);
      customer.value.name = result.name;
      if (result.regon) {
        customer.value.regon = result.regon;
      }
      customer.value.address.street = addr.street;
      customer.value.address.zip = addr.zip;
      customer.value.address.city = addr.city;

      toast.add({
        severity: 'success',
        summary: 'Potwierdzenie',
        detail: 'Uzupełniono dane firmy na podstawie NIP.',
        life: 3000,
      });
    } catch (reason) {
      const err = reason as AxiosError;
      toast.add({
        severity: 'error',
        summary: 'Wyszukiwanie po NIP',
        detail: (err?.response?.data as { message?: string })?.message ?? 'Nie udało się pobrać danych.',
        life: 5000,
      });
    }
  }

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
    }

    if (customer.value.customerType === CustomerType.COMPANY) {
      return (
        customer.value.customerType &&
        customer.value.name.length > 0 &&
        customer.value.nip.length > 0 &&
        customer.value.address.street.length > 0 &&
        customer.value.address.zip.length > 0 &&
        customer.value.address.city.length > 0
      );
    }

    return false;
  };

  const showErrorFirstName = () => {
    if (isCompanyType.value) return false;
    return submitted.value && customer.value.firstName.length <= 0;
  };

  const showErrorName = () => submitted.value && customer.value.name.length <= 0;

  const showErrorNip = () => {
    const isTenDigits = /^\d{10}$/.test(customer.value.nip);
    if (isCompanyType.value) {
      return submitted.value && !isTenDigits;
    }

    return submitted.value && customer.value.nip.length > 0 && !isTenDigits;
  };

  const showErrorRegon = () => {
    if (submitted.value && customer.value.regon.length > 0) {
      const isNineDigits = /^\d{9}$/.test(customer.value.regon);
      const isFourteenDigits = /^\d{14}$/.test(customer.value.regon);
      return !(isNineDigits || isFourteenDigits);
    }

    return false;
  };

  const showErrorStreet = () => submitted.value && customer.value.address.street.length <= 0;

  const showErrorZip = () => {
    if (submitted.value) {
      const { zip } = customer.value.address;
      return !(/(^\d{2}-\d{3}$)/.test(zip) && zip.length <= 6) && !(/(^\d{5})/.test(zip) && zip.length <= 5);
    }

    return false;
  };

  const showErrorCity = () => submitted.value && customer.value.address.city.length <= 0;

  const showErrorMail = () => {
    if (submitted.value && customer.value.mail.length > 0) {
      return !customer.value.mail.includes('@');
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
  <TheMenu />

  <div class="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6">
    <form class="w-full" @submit.stop.prevent="saveCustomer">
      <Panel
        class="overflow-hidden rounded-[1.75rem] border border-surface-200 bg-surface-100 shadow-lg dark:border-surface-700 dark:bg-surface-800"
      >
        <template #header>
          <div class="flex w-full flex-col gap-4 border-b border-surface-200 px-4 py-4 dark:border-surface-700 sm:px-6">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <OfficeIconButton
                  title="Powrót do listy klientów"
                  class="text-primary-400"
                  icon="pi pi-arrow-left"
                  @click="router.push({ name: 'Customers' })"
                />
                <div>
                  <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 sm:text-3xl">
                    {{ customerTitle }}
                  </h1>
                  <p class="mt-1 text-sm text-surface-600 dark:text-surface-400">
                    Sekcyjny formularz klienta z automatycznym uzupełnianiem danych po NIP.
                  </p>
                </div>
              </div>

              <ProgressSpinner v-if="customerStore.loadingCustomer" class="h-9 w-9 shrink-0" stroke-width="5" />
            </div>
          </div>
        </template>

        <div class="flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
          <section :class="sectionClass">
            <div class="flex flex-col gap-4">
              <div>
                <div :class="sectionTitleClass">
                  <i class="pi pi-search text-sm text-primary-500" />
                  <span>Dane z rejestru (GUS)</span>
                </div>
                <p class="mt-1 text-sm text-surface-600 dark:text-surface-400">
                  {{ customerLookupHint }}
                </p>
              </div>

              <div class="flex flex-col gap-1">
                <label class="pb-1 pl-1 text-sm font-medium text-surface-700 dark:text-surface-300" for="customer-nip-lookup">NIP</label>
                <div class="flex min-w-0 flex-nowrap items-center gap-3">
                  <InputText
                    id="customer-nip-lookup"
                    :model-value="customer.nip"
                    :class="inputClass"
                    :invalid="showErrorNip()"
                    maxlength="10"
                    size="large"
                    placeholder="np. 1234567890"
                    @update:model-value="updateCustomerNip"
                    @paste.prevent="handleCustomerNipPaste"
                  />

                  <Button
                    type="button"
                    label="Szukaj"
                    icon="pi pi-search"
                    :loading="companyLookupStore.loadingLookup"
                    :disabled="!isCompanyType || companyLookupStore.loadingLookup"
                    class="h-[3rem] shrink-0 rounded-xl px-5 font-semibold uppercase tracking-wide"
                    @click="lookupCompanyByNip"
                  />
                </div>
                <small :class="helperClass">{{ showErrorNip() ? 'Pole NIP musi mieć 10 cyfr.' : '\u00A0' }}</small>
              </div>
            </div>
          </section>

          <section :class="sectionClass">
            <div class="flex flex-col gap-4">
              <div :class="sectionTitleClass">
                <i class="pi pi-info-circle text-sm text-primary-500" />
                <span>Informacje ogólne</span>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-type">Typ klienta</label>
                  <Select
                    id="customer-type"
                    v-model="customer.customerType"
                    :options="UtilsService.getCustomerTypeOption()"
                    option-label="label"
                    option-value="value"
                    required
                    size="large"
                  />
                  <small class="min-h-5 pl-1 text-xs text-transparent">.</small>
                </div>

                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-regon">REGON</label>
                  <InputText
                    id="customer-regon"
                    v-model="customer.regon"
                    :class="inputClass"
                    :invalid="showErrorRegon()"
                    maxlength="14"
                    :disabled="!isCompanyType"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorRegon() ? 'Pole musi mieć 9 lub 14 cyfr.' : '\u00A0' }}</small>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-first-name">Imię</label>
                  <InputText
                    id="customer-first-name"
                    v-model="customer.firstName"
                    :class="inputClass"
                    :invalid="showErrorFirstName()"
                    :disabled="isCompanyType"
                    maxlength="40"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorFirstName() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
                </div>

                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-name">{{ customerNameLabel }}</label>
                  <InputText
                    id="customer-name"
                    v-model="customer.name"
                    :class="inputClass"
                    maxlength="100"
                    :invalid="showErrorName()"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorName() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
                </div>
              </div>
            </div>
          </section>

          <section :class="sectionClass">
            <div class="flex flex-col gap-4">
              <div :class="sectionTitleClass">
                <i class="pi pi-map-marker text-sm text-primary-500" />
                <span>Adres</span>
              </div>

              <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem]">
                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-street">Ulica</label>
                  <InputText
                    id="customer-street"
                    v-model="customer.address.street"
                    :class="inputClass"
                    :invalid="showErrorStreet()"
                    maxlength="100"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorStreet() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
                </div>

                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-zip">Kod</label>
                  <InputText
                    id="customer-zip"
                    v-model="customer.address.zip"
                    :class="inputClass"
                    maxlength="6"
                    :invalid="showErrorZip()"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorZip() ? 'Format 61754 lub 61-754.' : '\u00A0' }}</small>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-1">
                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-city">Miasto</label>
                  <InputText
                    id="customer-city"
                    v-model="customer.address.city"
                    :class="inputClass"
                    maxlength="100"
                    :invalid="showErrorCity()"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorCity() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
                </div>
              </div>
            </div>
          </section>

          <section :class="sectionClass">
            <div class="flex flex-col gap-4">
              <div :class="sectionTitleClass">
                <i class="pi pi-phone text-sm text-primary-500" />
                <span>Kontakt</span>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-mail">E-mail</label>
                  <InputText
                    id="customer-mail"
                    v-model="customer.mail"
                    :class="inputClass"
                    :invalid="showErrorMail()"
                    maxlength="100"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorMail() ? 'Niepoprawny format.' : '\u00A0' }}</small>
                </div>

                <div class="flex flex-col">
                  <label :class="labelClass" for="customer-phone">Telefon</label>
                  <InputText
                    id="customer-phone"
                    v-model="customer.phone"
                    :class="inputClass"
                    maxlength="15"
                    :invalid="showErrorPhone()"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorPhone() ? 'Niepoprawny format.' : '\u00A0' }}</small>
                </div>
              </div>
            </div>
          </section>

          <section :class="sectionClass">
            <div class="flex flex-col gap-4">
              <div :class="sectionTitleClass">
                <i class="pi pi-file-edit text-sm text-primary-500" />
                <span>Dodatkowe informacje</span>
              </div>

              <div class="flex flex-col">
                <label :class="labelClass" for="customer-other-info">Uwagi</label>
                <Textarea id="customer-other-info" v-model="customer.otherInfo" rows="5" auto-resize />
              </div>
            </div>
          </section>
        </div>

        <template #footer>
          <div class="border-t border-surface-200 bg-surface-50 px-4 py-4 dark:border-surface-700 dark:bg-surface-900/70 sm:px-6">
            <div class="flex justify-end">
              <OfficeButton text="zapisz" btn-type="office-save" type="submit" :loading="btnShowBusy" :btn-disabled="isSaveBtnDisabled" />
            </div>
          </div>
        </template>
      </Panel>
    </form>
  </div>
</template>
