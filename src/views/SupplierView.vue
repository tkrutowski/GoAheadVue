<script setup lang="ts">
  import { useSupplierStore } from '@/stores/suppliers';
  import { useCompanyLookupStore } from '@/stores/companyLookup';
  import { useRoute, useRouter } from 'vue-router';
  import { computed, onMounted, ref } from 'vue';
  import { CustomerStatus } from '@/types/Customer';
  import type { Supplier } from '@/types/Supplier';
  import OfficeButton from '@/components/OfficeButton.vue';
  import { useToast } from 'primevue/usetoast';
  import TheMenu from '@/components/TheMenu.vue';
  import OfficeIconButton from '@/components/OfficeIconButton.vue';
  import BankAccountInfoCard from '@/components/BankAccountInfoCard.vue';
  import { UtilsService } from '@/service/UtilsService.ts';
  import type { AxiosError } from 'axios';

  const supplierStore = useSupplierStore();
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

  const supplier = ref<Supplier>({
    id: 0,
    name: '',
    nip: '',
    regon: '',
    phone: '',
    mail: '',
    otherInfo: '',
    status: CustomerStatus.ACTIVE,
    accountNumber: '',
    bankName: '',
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

  const isSaveBtnDisabled = computed(() => supplierStore.loadingSupplier || btnSaveDisabled.value);
  const supplierTitle = computed(() => (isEdit.value ? 'Edycja danych dostawcy' : 'Nowy dostawca'));

  function updateSupplierNip(value: string | number | undefined | null) {
    supplier.value.nip = UtilsService.normalizeNipDigits(String(value ?? ''));
  }

  function handleSupplierNipPaste(event: ClipboardEvent) {
    event.preventDefault();
    updateSupplierNip(event.clipboardData?.getData('text') ?? '');
  }

  function saveSupplier() {
    submitted.value = true;
    if (isEdit.value) {
      void editSupplier();
    } else {
      void newSupplier();
    }
  }

  async function newSupplier() {
    if (!isValid()) {
      showError('Uzupełnij brakujące elementy');
      return;
    }

    btnSaveDisabled.value = true;
    btnShowBusy.value = true;

    await supplierStore
      .addSupplierDb(supplier.value)
      .then(() => {
        toast.add({
          severity: 'success',
          summary: 'Potwierdzenie',
          detail: 'Zapisano dostawcę: ' + supplier.value.name,
          life: 3000,
        });
        submitted.value = false;
        setTimeout(() => {
          btnSaveDisabled.value = false;
          router.push({ name: 'Suppliers' });
        }, 3000);
      })
      .catch((reason: AxiosError) => {
        toast.add({
          severity: 'error',
          summary: 'Błąd podczas dodawania dostawcy.',
          detail: (reason?.response?.data as { message: string }).message,
          life: 5000,
        });
        btnSaveDisabled.value = false;
      })
      .finally(() => {
        btnShowBusy.value = false;
      });
  }

  async function editSupplier() {
    if (!isValid()) {
      showError('Uzupełnij brakujące elementy');
      return;
    }

    btnSaveDisabled.value = true;
    btnShowBusy.value = true;

    await supplierStore
      .updateSupplierDb(supplier.value)
      .then(() => {
        toast.add({
          severity: 'success',
          summary: 'Potwierdzenie',
          detail: 'Zaaktualizowano dane dostawcy: ' + supplier.value.name,
          life: 3000,
        });
        setTimeout(() => {
          router.push({ name: 'Suppliers' });
        }, 3000);
      })
      .catch((reason: AxiosError) => {
        toast.add({
          severity: 'error',
          summary: 'Błąd podczas edycji dostawcy.',
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
      const supplierId = Number(route.params.supplierId as string);
      await supplierStore
        .getSupplierFromDb(supplierId)
        .then((data) => {
          if (data) {
            supplier.value = data;
            supplier.value.nip = UtilsService.normalizeNipDigits(supplier.value.nip);
          }
        })
        .catch((error) => {
          console.error('Błąd podczas pobierania dostawcy:', error);
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

  async function lookupSupplierByNip() {
    const digits = UtilsService.normalizeNipDigits(supplier.value.nip);
    if (digits.length !== 10) {
      showError('Podaj NIP jako 10 cyfr.');
      return;
    }

    try {
      const result = await companyLookupStore.lookupByNip(digits);
      const addr = result.addressDto;

      supplier.value.nip = UtilsService.normalizeNipDigits(result.nip);
      supplier.value.name = result.name;
      if (result.regon) {
        supplier.value.regon = result.regon;
      }
      supplier.value.address.street = addr.street;
      supplier.value.address.zip = addr.zip;
      supplier.value.address.city = addr.city;
      const bankName = result.bankName;
      if (bankName != null && bankName !== '') {
        supplier.value.bankName = bankName;
      }
      if (result.accountNumber != null && result.accountNumber !== '') {
        supplier.value.accountNumber = result.accountNumber;
      }

      toast.add({
        severity: 'success',
        summary: 'Potwierdzenie',
        detail: 'Uzupełniono dane dostawcy na podstawie NIP.',
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
    return (
      supplier.value.name.length > 0 &&
      /^\d{10}$/.test(supplier.value.nip) &&
      supplier.value.address.street.length > 0 &&
      supplier.value.address.zip.length > 0 &&
      supplier.value.address.city.length > 0
    );
  };

  const showErrorName = () => submitted.value && supplier.value.name.length <= 0;
  const showErrorNip = () => submitted.value && !/^\d{10}$/.test(supplier.value.nip);
  const showErrorStreet = () => submitted.value && supplier.value.address.street.length <= 0;

  const showErrorZip = () => {
    if (submitted.value) {
      const { zip } = supplier.value.address;
      return !(/(^\d{2}-\d{3}$)/.test(zip) && zip.length <= 6) && !(/(^\d{5})/.test(zip) && zip.length <= 5);
    }

    return false;
  };

  const showErrorCity = () => submitted.value && supplier.value.address.city.length <= 0;

  const showErrorMail = () => {
    if (submitted.value && supplier.value.mail.length > 0) {
      return !supplier.value.mail.includes('@');
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

  <div class="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6">
    <form class="w-full" @submit.stop.prevent="saveSupplier">
      <Panel class="overflow-hidden rounded-[1.75rem] border border-surface-200 bg-surface-100 shadow-lg dark:border-surface-700 dark:bg-surface-800">
        <template #header>
          <div class="flex w-full flex-col gap-4 border-b border-surface-200 px-4 py-4 dark:border-surface-700 sm:px-6">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <OfficeIconButton
                  title="Powrót do listy dostawców"
                  class="text-primary-400"
                  icon="pi pi-arrow-left"
                  @click="router.push({ name: 'Suppliers' })"
                />
                <div>
                  <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0 sm:text-3xl">
                    {{ supplierTitle }}
                  </h1>
                  <p class="mt-1 text-sm text-surface-600 dark:text-surface-400">
                    Sekcyjny formularz dostawcy z szybkim pobieraniem danych z GUS.
                  </p>
                </div>
              </div>

              <ProgressSpinner v-if="supplierStore.loadingSupplier" class="h-9 w-9 shrink-0" stroke-width="5" />
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
                  Wpisz NIP i wybierz Szukaj, aby automatycznie uzupełnić nazwę, REGON, adres oraz numer konta.
                </p>
              </div>

              <div class="flex flex-col gap-1">
                <label :class="labelClass" for="supplier-nip-lookup">NIP</label>
                <div class="flex min-w-0 flex-nowrap items-center gap-3">
                  <InputText
                    id="supplier-nip-lookup"
                    :model-value="supplier.nip"
                    :class="inputClass"
                    :invalid="showErrorNip()"
                    maxlength="10"
                    size="large"
                    placeholder="np. 1234567890"
                    @update:model-value="updateSupplierNip"
                    @paste.prevent="handleSupplierNipPaste"
                  />

                  <Button
                    type="button"
                    label="Szukaj"
                    icon="pi pi-search"
                    :loading="companyLookupStore.loadingLookup"
                    :disabled="companyLookupStore.loadingLookup"
                    class="h-[3rem] shrink-0 rounded-xl px-5 font-semibold uppercase tracking-wide"
                    @click="lookupSupplierByNip"
                  />
                </div>
                <small :class="helperClass">{{ showErrorNip() ? 'Pole NIP musi mieć 10 cyfr.' : '\u00A0' }}</small>
              </div>

            </div>
          </section>

          <BankAccountInfoCard :bank-name="supplier.bankName" :account-number="supplier.accountNumber" />

          <section :class="sectionClass">
            <div class="flex flex-col gap-4">
              <div :class="sectionTitleClass">
                <i class="pi pi-info-circle text-sm text-primary-500" />
                <span>Informacje ogólne</span>
              </div>

              <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
                <div class="flex flex-col">
                  <label :class="labelClass" for="supplier-name">Nazwa dostawcy</label>
                  <InputText id="supplier-name" v-model="supplier.name" :class="inputClass" :invalid="showErrorName()" maxlength="100" size="large" />
                  <small :class="helperClass">{{ showErrorName() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
                </div>

                <div class="flex flex-col">
                  <label :class="labelClass" for="supplier-regon">REGON</label>
                  <InputText id="supplier-regon" v-model="supplier.regon" :class="inputClass" maxlength="14" size="large" />
                  <small class="min-h-5 pl-1 text-xs text-transparent">.</small>
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
                  <label :class="labelClass" for="supplier-street">Ulica</label>
                  <InputText
                    id="supplier-street"
                    v-model="supplier.address.street"
                    :class="inputClass"
                    :invalid="showErrorStreet()"
                    maxlength="100"
                    size="large"
                  />
                  <small :class="helperClass">{{ showErrorStreet() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
                </div>

                <div class="flex flex-col">
                  <label :class="labelClass" for="supplier-zip">Kod</label>
                  <InputText id="supplier-zip" v-model="supplier.address.zip" :class="inputClass" maxlength="6" :invalid="showErrorZip()" size="large" />
                  <small :class="helperClass">{{ showErrorZip() ? 'Format 61754 lub 61-754.' : '\u00A0' }}</small>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-1">
                <div class="flex flex-col">
                  <label :class="labelClass" for="supplier-city">Miasto</label>
                  <InputText id="supplier-city" v-model="supplier.address.city" :class="inputClass" maxlength="100" :invalid="showErrorCity()" size="large" />
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
                  <label :class="labelClass" for="supplier-mail">E-mail</label>
                  <InputText id="supplier-mail" v-model="supplier.mail" :class="inputClass" :invalid="showErrorMail()" maxlength="100" size="large" />
                  <small :class="helperClass">{{ showErrorMail() ? 'Niepoprawny format.' : '\u00A0' }}</small>
                </div>

                <div class="flex flex-col">
                  <label :class="labelClass" for="supplier-phone">Telefon</label>
                  <InputText id="supplier-phone" v-model="supplier.phone" :class="inputClass" maxlength="15" :invalid="showErrorPhone()" size="large" />
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
                <label :class="labelClass" for="supplier-other-info">Uwagi</label>
                <Textarea id="supplier-other-info" v-model="supplier.otherInfo" rows="5" auto-resize />
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
