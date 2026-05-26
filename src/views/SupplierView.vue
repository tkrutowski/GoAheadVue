<script setup lang="ts">
  import { useSupplierStore } from '@/stores/suppliers';
  import { useRoute, useRouter } from 'vue-router';
  import { computed, onMounted, ref } from 'vue';
  import type { Supplier } from '@/types/Supplier';
  import OfficeButton from '@/components/OfficeButton.vue';
  import { useToast } from 'primevue/usetoast';
  import TheMenu from '@/components/TheMenu.vue';
  import OfficeIconButton from '@/components/OfficeIconButton.vue';
  import BankAccountInfoCard from '@/components/BankAccountInfoCard.vue';
  import SupplierFormCore from '@/components/supplier/SupplierFormCore.vue';
  import {
    createEmptySupplier,
    useSupplierForm,
    SUPPLIER_FORM_SECTION_CLASS,
    SUPPLIER_FORM_SECTION_TITLE_CLASS,
    SUPPLIER_FORM_LABEL_CLASS,
    SUPPLIER_FORM_HELPER_CLASS,
    SUPPLIER_FORM_INPUT_CLASS,
  } from '@/composables/useSupplierForm';
  import { UtilsService } from '@/service/UtilsService.ts';
  import type { AxiosError } from 'axios';

  const supplierStore = useSupplierStore();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const supplier = ref<Supplier>(createEmptySupplier());

  const btnSaveDisabled = ref(false);
  const btnShowBusy = ref(false);
  const submitted = ref(false);
  const isEdit = ref(false);

  const { isValid, showFormError, showErrorMail, showErrorPhone } = useSupplierForm(supplier, submitted);

  const isSaveBtnDisabled = computed(() => supplierStore.loadingSupplier || btnSaveDisabled.value);
  const supplierTitle = computed(() => (isEdit.value ? 'Edycja danych dostawcy' : 'Nowy dostawca'));

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
      showFormError('Uzupełnij brakujące elementy');
      return;
    }

    btnSaveDisabled.value = true;
    btnShowBusy.value = true;

    await supplierStore
      .addSupplierDb(supplier.value)
      .then((saved) => {
        toast.add({
          severity: 'success',
          summary: 'Potwierdzenie',
          detail: 'Zapisano dostawcę: ' + saved.name,
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
      showFormError('Uzupełnij brakujące elementy');
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
</script>

<template>
  <TheMenu />

  <div class="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6">
    <form class="w-full" @submit.stop.prevent="saveSupplier">
      <Panel
        class="overflow-hidden rounded-[1.75rem] border border-surface-200 bg-surface-100 shadow-lg dark:border-surface-700 dark:bg-surface-800"
      >
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
          <SupplierFormCore v-model:supplier="supplier" v-model:submitted="submitted" show-regon />

          <BankAccountInfoCard :bank-name="supplier.bankName" :account-number="supplier.accountNumber" />

          <section :class="SUPPLIER_FORM_SECTION_CLASS">
            <div class="flex flex-col gap-4">
              <div :class="SUPPLIER_FORM_SECTION_TITLE_CLASS">
                <i class="pi pi-phone text-sm text-primary-500" />
                <span>Kontakt</span>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="flex flex-col">
                  <label :class="SUPPLIER_FORM_LABEL_CLASS" for="supplier-mail">E-mail</label>
                  <InputText
                    id="supplier-mail"
                    v-model="supplier.mail"
                    :class="SUPPLIER_FORM_INPUT_CLASS"
                    :invalid="showErrorMail()"
                    maxlength="100"
                    size="large"
                  />
                  <small :class="SUPPLIER_FORM_HELPER_CLASS">{{ showErrorMail() ? 'Niepoprawny format.' : '\u00A0' }}</small>
                </div>

                <div class="flex flex-col">
                  <label :class="SUPPLIER_FORM_LABEL_CLASS" for="supplier-phone">Telefon</label>
                  <InputText
                    id="supplier-phone"
                    v-model="supplier.phone"
                    :class="SUPPLIER_FORM_INPUT_CLASS"
                    maxlength="15"
                    :invalid="showErrorPhone()"
                    size="large"
                  />
                  <small :class="SUPPLIER_FORM_HELPER_CLASS">{{ showErrorPhone() ? 'Niepoprawny format.' : '\u00A0' }}</small>
                </div>
              </div>
            </div>
          </section>

          <section :class="SUPPLIER_FORM_SECTION_CLASS">
            <div class="flex flex-col gap-4">
              <div :class="SUPPLIER_FORM_SECTION_TITLE_CLASS">
                <i class="pi pi-file-edit text-sm text-primary-500" />
                <span>Dodatkowe informacje</span>
              </div>

              <div class="flex flex-col">
                <label :class="SUPPLIER_FORM_LABEL_CLASS" for="supplier-other-info">Uwagi</label>
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
