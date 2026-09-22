<script setup lang="ts">
  import { useCustomerStore } from '@/stores/customers';
  import { useInvoiceStore } from '@/stores/invoices';
  import { useRoute, useRouter } from 'vue-router';
  import { computed, onMounted, ref, watch } from 'vue';
  import { type Customer } from '@/types/Customer';
  import { type Invoice, type InvoiceItem, PaymentMethod, PaymentStatus } from '@/types/Invoice';
  import moment from 'moment';
  import OfficeButton from '@/components/OfficeButton.vue';
  import { useToast } from 'primevue/usetoast';
  import TheMenu from '@/components/TheMenu.vue';
  import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
  import OfficeIconButton from '@/components/OfficeIconButton.vue';
  import { UtilsService } from '@/service/UtilsService.ts';
  import type { DataTableCellEditCompleteEvent } from 'primevue';
  import type { AxiosError } from 'axios';
  import { Vat } from '@/types/Cost.ts';

  const customerStore = useCustomerStore();
  const invoiceStore = useInvoiceStore();
  const route = useRoute();
  const router = useRouter();

  const toast = useToast();
  const invoice = ref<Invoice>({
    id: 0,
    customer: null,
    number: '',
    sellDate: new Date(),
    invoiceDate: new Date(),
    paymentMethod: PaymentMethod.TRANSFER,
    paymentStatus: PaymentStatus.TO_PAY,
    paymentDeadline: 14,
    paymentDate: null,
    otherInfo: '',
    ksefNumber: '',
    upoUrl: '',
    pdfUrl: '',
    vatGroupRecipientNip: '',
    vatGroupRecipientName: '',
    vatGroupRecipientStreet: '',
    vatGroupRecipientZip: '',
    vatGroupRecipientCity: '',
    buyerContactEmail: '',
    invoiceItems: [],
  });

  const isVatGroupRecipient = ref(false);
  const vatGroupRecipientCustomer = ref<Customer | null>(null);

  const invoiceItem = ref<InvoiceItem>({
    idInvoice: 0,
    unit: '',
    id: 0,
    amount: 0,
    name: '',
    quantity: 0,
    vat: Vat.VAT_ZW,
  });
  const invoiceNumber = ref<number>(0);
  const invoiceYear = ref<number>();
  const paymentDeadline = ref<number>();
  const btnShowBusy = ref<boolean>(false);
  const btnSaveDisabled = ref<boolean>(false);

  /** Numer faktury jako YYYY/NN (2 cyfry — spójny sort stringowy w backendzie). */
  const formatInvoiceNumber = (year: number, number: number): string => {
    return `${year}/${String(number).padStart(2, '0')}`;
  };

  watch(invoiceYear, async (newValue) => {
    if (isEdit.value || !newValue) return;
    try {
      invoiceNumber.value = await invoiceStore.findInvoiceNumber(newValue);
    } catch (error) {
      console.error('Błąd podczas pobierania numeru faktury:', error);
      toast.add({
        severity: 'error',
        summary: 'Błąd pobierania numeru faktury.',
        detail: getErrorMessage(error),
        life: 5000,
      });
    }
  });

  /** Komunikat błędu z odpowiedzi API; bezpieczny także gdy serwer nie odpowiedział (timeout, brak sieci). */
  const getErrorMessage = (error: unknown): string => {
    const err = error as AxiosError<{ message?: string }>;
    return err?.response?.data?.message ?? err?.message ?? 'Nieznany błąd.';
  };

  const DEFAULT_PAYMENT_DEADLINE = 14;
  const isCashPayment = computed(() => invoice.value.paymentMethod === PaymentMethod.CASH);

  /** Gotówka → 0 dni (bez zmiany); pozostałe formy → domyślnie 14, gdy brak dodatniej wartości. */
  watch(
    () => invoice.value.paymentMethod,
    (method) => {
      if (method === PaymentMethod.CASH) {
        paymentDeadline.value = 0;
      } else if (!paymentDeadline.value || paymentDeadline.value <= 0) {
        paymentDeadline.value = DEFAULT_PAYMENT_DEADLINE;
      }
    }
  );

  const totalAmount = computed(() => {
    let total = invoice.value.invoiceItems.reduce((acc, item) => {
      return acc + item.quantity * item.amount;
    }, 0);
    return UtilsService.formatCurrency(total);
  });
  const isSaveBtnDisabled = computed(() => {
    return (
      invoiceStore.loadingPaymentType ||
      invoiceStore.loadingInvoices ||
      invoiceStore.loadingInvoiceNo ||
      customerStore.loadingCustomer ||
      btnSaveDisabled.value
    );
  });

  //
  //SAVE
  //
  function applyPaymentDeadlineToInvoice() {
    const days = isCashPayment.value ? 0 : (paymentDeadline.value ?? invoice.value.paymentDeadline);
    invoice.value.paymentDeadline = days;
    if (invoice.value.invoiceDate) {
      invoice.value.paymentDate = moment(invoice.value.invoiceDate).add(days, 'day').toDate();
    }
  }

  function hasVatGroupRecipientData(inv: Invoice): boolean {
    return !!(
      inv.vatGroupRecipientName?.trim() ||
      inv.vatGroupRecipientNip?.trim() ||
      inv.vatGroupRecipientStreet?.trim() ||
      inv.vatGroupRecipientZip?.trim() ||
      inv.vatGroupRecipientCity?.trim() ||
      inv.buyerContactEmail?.trim()
    );
  }

  function clearVatGroupRecipientFields() {
    invoice.value.vatGroupRecipientNip = '';
    invoice.value.vatGroupRecipientName = '';
    invoice.value.vatGroupRecipientStreet = '';
    invoice.value.vatGroupRecipientZip = '';
    invoice.value.vatGroupRecipientCity = '';
    invoice.value.buyerContactEmail = '';
  }

  function applyLatestVatGroupRecipient(customerId: number | undefined) {
    const latest = invoiceStore.getLatestVatGroupRecipientForCustomer(customerId);
    if (!latest) return;
    invoice.value.vatGroupRecipientNip = latest.vatGroupRecipientNip;
    invoice.value.vatGroupRecipientName = latest.vatGroupRecipientName;
    invoice.value.vatGroupRecipientStreet = latest.vatGroupRecipientStreet;
    invoice.value.vatGroupRecipientZip = latest.vatGroupRecipientZip;
    invoice.value.vatGroupRecipientCity = latest.vatGroupRecipientCity;
    invoice.value.buyerContactEmail = latest.buyerContactEmail;
  }

  function applyVatGroupRecipientFromCustomer(customer: Customer | null) {
    if (!customer) return;
    invoice.value.vatGroupRecipientName = [customer.name, customer.firstName].filter(Boolean).join(' ');
    invoice.value.vatGroupRecipientNip = UtilsService.normalizeNipDigits(customer.nip);
    invoice.value.vatGroupRecipientStreet = customer.address?.street ?? '';
    invoice.value.vatGroupRecipientZip = customer.address?.zip ?? '';
    invoice.value.vatGroupRecipientCity = customer.address?.city ?? '';
    if (customer.mail?.trim()) {
      invoice.value.buyerContactEmail = customer.mail.trim();
    }
  }

  function prepareInvoiceForSave() {
    if (!isVatGroupRecipient.value) {
      clearVatGroupRecipientFields();
    } else {
      invoice.value.vatGroupRecipientNip = UtilsService.normalizeNipDigits(invoice.value.vatGroupRecipientNip);
    }
  }

  function saveInvoice() {
    submitted.value = true;
    if (isEdit.value) {
      editInvoice();
    } else {
      newInvoice();
    }
  }

  //
  //---------------------------------------------------------NEW INVOICE----------------------------------------------
  //
  async function newInvoice() {
    console.log('newInvoice()');
    if (!isValid()) {
      showError('Uzupełnij brakujące elementy');
    } else {
      btnSaveDisabled.value = true;
      btnShowBusy.value = true;
      invoice.value.number = formatInvoiceNumber(invoiceYear.value!, invoiceNumber.value);
      applyPaymentDeadlineToInvoice();
      prepareInvoiceForSave();
      await invoiceStore
        .addInvoiceDb(invoice.value)
        .then(() => {
          toast.add({
            severity: 'success',
            summary: 'Potwierdzenie',
            detail: 'Zapisano fakturę nr: ' + invoice.value.number,
            life: 3000,
          });
          setTimeout(() => {
            router.push({ name: 'Invoices' });
          }, 3000);
        })
        .catch((reason: AxiosError) => {
          toast.add({
            severity: 'error',
            summary: 'Błąd podczas zapisu faktury.',
            detail: getErrorMessage(reason),
            life: 5000,
          });
          btnSaveDisabled.value = false;
          btnShowBusy.value = false;
        });
    }
  }

  //
  //-----------------------------------------------------EDIT INVOICE------------------------------------------------
  //
  const isEdit = ref<boolean>(false);
  /** Wczytywanie pojedynczej faktury do edycji (GET z bazy). */
  const loadingInvoiceForEdit = ref(false);

  watch(
    () => invoice.value.customer,
    (customer) => {
      if (isEdit.value) return;
      invoice.value.otherInfo = invoiceStore.getLatestOtherInfoForCustomer(customer?.id);
      if (isCashPayment.value) {
        paymentDeadline.value = 0;
      } else {
        const latestDeadline = invoiceStore.getLatestPaymentDeadlineForCustomer(customer?.id);
        paymentDeadline.value = latestDeadline > 0 ? latestDeadline : DEFAULT_PAYMENT_DEADLINE;
      }
      if (isVatGroupRecipient.value) {
        applyLatestVatGroupRecipient(customer?.id);
      }
    }
  );

  watch(isVatGroupRecipient, (checked) => {
    if (!checked) {
      clearVatGroupRecipientFields();
      vatGroupRecipientCustomer.value = null;
      return;
    }
    if (!isEdit.value && invoice.value.customer) {
      applyLatestVatGroupRecipient(invoice.value.customer.id);
    }
  });

  watch(vatGroupRecipientCustomer, (customer) => {
    if (customer) {
      applyVatGroupRecipientFromCustomer(customer);
    }
  });

  async function editInvoice() {
    if (!isValid()) {
      showError('Uzupełnij brakujące elementy');
    } else {
      invoice.value.number = formatInvoiceNumber(invoiceYear.value!, invoiceNumber.value);
      applyPaymentDeadlineToInvoice();
      prepareInvoiceForSave();
      btnSaveDisabled.value = true;
      btnShowBusy.value = true;
      await invoiceStore
        .updateInvoiceDb(invoice.value)
        .then(() => {
          toast.add({
            severity: 'success',
            summary: 'Potwierdzenie',
            detail: 'Zaaktualizowano fakturę nr: ' + invoice.value.number,
            life: 3000,
          });
          setTimeout(() => {
            router.push({ name: 'Invoices' });
          }, 3000);
        })
        .catch((reason: AxiosError) => {
          toast.add({
            severity: 'error',
            summary: 'Błąd podczas edycji faktury.',
            detail: getErrorMessage(reason),
            life: 5000,
          });
          btnSaveDisabled.value = false;
          btnShowBusy.value = false;
        });
    }
  }

  //
  // ---------------------------------------------------------NEW INVOICE_ITEM---------------------------------------
  //
  function newItem() {
    const latestItem = invoiceStore.getLatestItemForCustomer(invoice.value.customer?.id);

    if (latestItem !== null) {
      invoiceItem.value = JSON.parse(JSON.stringify(latestItem));
      invoiceItem.value.id = 0;
      invoiceItem.value.idInvoice = invoice.value.id;
      invoiceItem.value.unit = latestItem.unit;
      invoiceItem.value.name = latestItem.name;
      invoiceItem.value.amount = latestItem.amount;
      invoiceItem.value.quantity = latestItem.quantity;
    } else {
      invoiceItem.value.idInvoice = invoice.value.id;
      invoiceItem.value.unit = 'l';
      invoiceItem.value.name = 'Kurs języka angielskiego ';
      invoiceItem.value.amount = 0;
      invoiceItem.value.quantity = 0;
    }
    invoice.value.invoiceItems.push({ ...invoiceItem.value });
  }

  //
  //------------------------------------------------- EDIT INVOICE_ITEM---------------------------------------------------
  //
  const onCellEditComplete = (event: DataTableCellEditCompleteEvent) => {
    let { data, newValue, field, originalEvent } = event;
    console.log('onCellEditComplete event', event);

    switch (field) {
      case 'amount':
      case 'quantity':
        if (UtilsService.isPositiveFloat(newValue)) data[field] = newValue;
        else originalEvent.preventDefault();
        break;

      default:
        if (newValue && newValue.trim().length > 0) data[field] = newValue;
        else originalEvent.preventDefault();
        break;
    }
  };

  //
  //DELETE INVOICE ITEM MODAL
  const showDeleteConfirmationDialog = ref<boolean>(false);
  const invoiceDeleteItemIndex = ref<number>(-1);
  const confirmDeleteItem = (item: InvoiceItem, index: number) => {
    invoiceItem.value = item;
    invoiceDeleteItemIndex.value = index;
    showDeleteConfirmationDialog.value = true;
  };

  const deleteConfirmationMessage = computed(() => {
    if (invoiceItem.value) return `Czy chcesz usunąc pozycję <b>${invoiceItem.value.name}</b>?`;
    return 'No message';
  });

  const submitDelete = async () => {
    console.log('submitDelete()');
    if (invoiceItem.value) {
      if (invoiceDeleteItemIndex.value !== -1) invoice.value.invoiceItems.splice(invoiceDeleteItemIndex.value, 1);
    }
    showDeleteConfirmationDialog.value = false;
  };

  onMounted(() => {
    console.log('onMounted GET');
    btnSaveDisabled.value = true;
    if (customerStore.customers.length <= 1) customerStore.getCustomersFromDb('ALL');
    invoiceStore.getPaymentType();
    btnSaveDisabled.value = false;
  });

  onMounted(async () => {
    // console.log("onMounted EDIT", route.params);
    btnSaveDisabled.value = true;
    isEdit.value = route.params.isEdit === 'true';
    if (!isEdit.value) {
      console.log('onMounted NEW INVOICE');
      invoiceYear.value = new Date(Date.now()).getFullYear();
      paymentDeadline.value = isCashPayment.value ? 0 : DEFAULT_PAYMENT_DEADLINE;
    } else {
      console.log('onMounted EDIT INVOICE');
      const invoiceId = Number(route.params.invoiceId as string);
      loadingInvoiceForEdit.value = true;
      invoiceStore
        .getInvoiceFromDb(invoiceId)
        .then(async (data) => {
          if (data) {
            // klient mógł powstać po stronie backendu (import z KSeF) po załadowaniu listy - odśwież, żeby select go znalazł
            if (data.customer && !customerStore.customers.some((c) => c.id === data.customer?.id)) {
              await customerStore.getCustomersFromDb('ALL');
            }
            invoice.value = data;
            isVatGroupRecipient.value = hasVatGroupRecipientData(data);
            if (data.paymentDate && data.invoiceDate) {
              const paymentDate = moment(data.paymentDate);
              const invoiceDate = moment(data.invoiceDate);

              paymentDeadline.value = paymentDate.diff(invoiceDate, 'days');
            } else {
              paymentDeadline.value = 0;
            }

            invoiceNumber.value = Number(invoice.value.number.split('/')[1]);
            invoiceYear.value = Number(invoice.value.number.split('/')[0]);
          }
        })
        .catch((error) => {
          console.error('Błąd podczas pobierania faktury:', error);
        })
        .finally(() => {
          loadingInvoiceForEdit.value = false;
        });
    }
    btnSaveDisabled.value = false;
  });

  //
  //ERROR
  //
  const submitted = ref(false);

  const showError = (msg: string) => {
    toast.add({
      severity: 'error',
      summary: 'Error Message',
      detail: msg,
      life: 3000,
    });
  };
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const isValidVatGroupRecipient = () => {
    if (!isVatGroupRecipient.value) return true;
    const inv = invoice.value;
    const nipDigits = UtilsService.normalizeNipDigits(inv.vatGroupRecipientNip);
    return (
      inv.vatGroupRecipientName.trim().length > 0 &&
      /^\d{10}$/.test(nipDigits) &&
      inv.vatGroupRecipientStreet.trim().length > 0 &&
      inv.vatGroupRecipientZip.trim().length > 0 &&
      inv.vatGroupRecipientCity.trim().length > 0 &&
      inv.buyerContactEmail.trim().length > 0 &&
      isValidEmail(inv.buyerContactEmail)
    );
  };

  const isValid = () => {
    return (
      invoice.value.customer !== null &&
      invoice.value.invoiceItems.length > 0 &&
      invoice.value.invoiceItems.every((item) => item.quantity > 0 && item.amount > 0) &&
      isValidPaymentDeadline() &&
      isValidVatGroupRecipient()
    );
  };

  const isValidPaymentDeadline = () => isCashPayment.value || (paymentDeadline.value ?? 0) > 0;
  const isPaymentDeadlineInvalid = computed(() => submitted.value && !isValidPaymentDeadline());

  const isVatGroupRecipientNameInvalid = computed(
    () => submitted.value && isVatGroupRecipient.value && !invoice.value.vatGroupRecipientName.trim()
  );
  const isVatGroupRecipientNipInvalid = computed(() => {
    if (!submitted.value || !isVatGroupRecipient.value) return false;
    const digits = UtilsService.normalizeNipDigits(invoice.value.vatGroupRecipientNip);
    return digits.length === 0 || !/^\d{10}$/.test(digits);
  });
  const isVatGroupRecipientStreetInvalid = computed(
    () => submitted.value && isVatGroupRecipient.value && !invoice.value.vatGroupRecipientStreet.trim()
  );
  const isVatGroupRecipientZipInvalid = computed(
    () => submitted.value && isVatGroupRecipient.value && !invoice.value.vatGroupRecipientZip.trim()
  );
  const isVatGroupRecipientCityInvalid = computed(
    () => submitted.value && isVatGroupRecipient.value && !invoice.value.vatGroupRecipientCity.trim()
  );
  const isBuyerContactEmailInvalid = computed(() => {
    if (!submitted.value || !isVatGroupRecipient.value) return false;
    const email = invoice.value.buyerContactEmail.trim();
    return email.length === 0 || !isValidEmail(email);
  });

  const customerFieldErrorId = 'invoice-customer-error';

  const isCustomerFieldInvalid = computed(() => submitted.value && invoice.value.customer === null);

  const customerSelectPt = computed(() => ({
    label: isCustomerFieldInvalid.value ? { 'aria-describedby': customerFieldErrorId } : {},
  }));

  const getCustomerLabel = (option: Customer) => {
    return [option.name, option.firstName].filter(Boolean).join(' ');
  };
</script>

<template>
  <TheMenu />
  <ConfirmationDialog
    v-model:visible="showDeleteConfirmationDialog"
    :msg="deleteConfirmationMessage"
    label="Usuń"
    @save="submitDelete"
    @cancel="showDeleteConfirmationDialog = false"
  />

  <div class="m-4">
    <form @submit.stop.prevent="saveInvoice">
      <Panel>
        <template #header>
          <div class="flex w-full items-center gap-2 sm:gap-4">
            <div class="flex min-w-0 flex-1 items-center justify-start">
              <OfficeIconButton
                title="Powrót do listy faktur."
                class="text-primary-400"
                icon="pi pi-arrow-left"
                @click="() => router.push({ name: 'Invoices' })"
              />
            </div>
            <div class="flex min-w-0 flex-1 items-center justify-center px-1">
              <span class="text-center text-3xl font-bold text-surface-500 dark:text-surface-400">
                <template v-if="!isEdit">Nowa faktura</template>
                <span v-else-if="loadingInvoiceForEdit" class="inline-flex items-center gap-2 whitespace-nowrap">
                  Edycja faktury nr:
                  <ProgressSpinner class="h-7 w-7 shrink-0" stroke-width="4" aria-label="Wczytywanie faktury" />
                </span>
                <template v-else>Edycja faktury nr: {{ invoice.number }}</template>
              </span>
            </div>
            <div class="flex min-w-0 flex-1 items-center justify-end">
              <OfficeButton text="zapisz" btn-type="office-save" type="submit" :loading="btnShowBusy" :btn-disabled="isSaveBtnDisabled" />
            </div>
          </div>
        </template>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Fieldset
            class="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700"
            legend="Dane faktury"
          >
            <!-- Row 1 Klient 50% | Numer 25% | Rok 25%  -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-start sm:gap-4">
              <div class="min-w-0 sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="input-customer">Wybierz klienta</label>
                <Select
                  class="w-full"
                  id="input-customer"
                  v-model="invoice.customer"
                  data-key="id"
                  :invalid="isCustomerFieldInvalid"
                  :options="isEdit ? customerStore.customers : customerStore.getCustomerActive"
                  :option-label="getCustomerLabel"
                  :loading="customerStore.loadingCustomer"
                  :pt="customerSelectPt"
                />
                <small
                  :id="customerFieldErrorId"
                  class="p-error block min-h-[1.25rem] text-red-500"
                  :role="isCustomerFieldInvalid ? 'alert' : undefined"
                  >{{ isCustomerFieldInvalid ? 'Pole jest wymagane.' : '\u00a0' }}</small
                >
              </div>
              <div class="min-w-0 sm:col-span-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="number">Numer faktury</label>
                <div class="flex min-w-0 w-full items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <InputNumber id="number" fluid v-model="invoiceNumber" mode="decimal" show-buttons :min="1" :max="99" />
                  </div>
                  <div v-if="invoiceStore.loadingInvoiceNo" class="mt-1 shrink-0">
                    <ProgressSpinner class="h-[30px] w-[30px]" stroke-width="5" />
                  </div>
                </div>
              </div>
              <div class="min-w-0 sm:col-span-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="year">Rok faktury</label>
                <InputNumber
                  id="year"
                  fluid
                  class="min-w-0 w-full max-w-full"
                  v-model="invoiceYear"
                  mode="decimal"
                  :use-grouping="false"
                  show-buttons
                  :min="2020"
                  :max="2050"
                />
              </div>
            </div>

            <!-- ROW-2  DATES  -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col w-full mt-4 sm:mt-0">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="input">Data wystawienia:</label>
                <Calendar v-model="invoice.invoiceDate" show-icon date-format="yy-mm-dd" />
              </div>
              <div class="flex flex-col w-full">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="input">Data sprzedaży:</label>
                <Calendar v-model="invoice.sellDate" show-icon date-format="yy-mm-dd" />
              </div>
            </div>

            <!-- ROW-3  LATE PAYMENT, PAYMENT_TYPE  -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:mt-4">
              <div class="flex flex-col w-full mt-4 sm:mt-0">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="input">Odroczenie płatności:</label>
                <InputNumber
                  id="paymentDeadline"
                  v-model="paymentDeadline"
                  mode="decimal"
                  :use-grouping="false"
                  show-buttons
                  :min="isCashPayment ? 0 : 1"
                  :max="90"
                  :disabled="isCashPayment"
                  :invalid="isPaymentDeadlineInvalid"
                />
                <small class="p-error block min-h-[1.25rem] text-red-500">
                  {{ isPaymentDeadlineInvalid ? 'Odroczenie płatności musi być większe od 0.' : ' ' }}
                </small>
              </div>
              <div class="flex flex-row gap-4">
                <div class="flex flex-col w-full">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="input-customer"
                    >Forma płatności:</label
                  >
                  <Select
                    id="input-customer"
                    v-model="invoice.paymentMethod"
                    :options="UtilsService.getPaymentMethodsOption()"
                    option-label="label"
                    option-value="value"
                    required
                    :loading="invoiceStore.loadingPaymentType"
                  />
                </div>
              </div>
            </div>

            <!-- ROW-4  OTHER INFO  -->
            <IftaLabel class="flex flex-col col-12 w-full mt-6">
              <Textarea id="otherInfo" v-model="invoice.otherInfo" rows="3" cols="30" fluid />
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="otherInfo">Dodatkowe informacje</label>
            </IftaLabel>
            <small class="block mt-1 text-surface-500 dark:text-surface-400">
              Możesz tu podać, kto z uczelni zamawiał towar/usługę (alternatywa dla e-maila kontaktowego).
            </small>

            <div class="mt-6 flex items-center gap-2">
              <Checkbox v-model="isVatGroupRecipient" input-id="isVatGroupRecipient" binary />
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer" for="isVatGroupRecipient">
                Faktura dla odbiorcy GV
              </label>
            </div>
          </Fieldset>

          <!-- TABLE INVOIS_ITEMS -->
          <Fieldset
            class="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700"
            legend="Pozycje na fakturze"
          >
            <DataTable
              :value="invoice.invoiceItems"
              class="pt-2 invoice-items-table"
              size="small"
              editMode="cell"
              dataKey="id"
              @cell-edit-complete="onCellEditComplete"
            >
              <template #header>
                <!--        input do filtrowania na razie tutaj. Potem przenieść do navbaru-->
                <div class="flex justify-end mb-3">
                  <OfficeButton
                    title="Podaj nową pozycję do faktury."
                    text="Dodaj"
                    btn-type="office-regular"
                    type="button"
                    @click="newItem"
                  />
                </div>
              </template>
              <!-- NAME -->
              <Column
                field="name"
                header="Nazwa"
                class="min-w-52"
                headerStyle="padding-left: 1.5rem"
                bodyStyle="padding-left: 1.5rem; cursor: pointer"
              >
                <template #editor="{ data, field }">
                  <InputText v-model="data[field]" fluid maxlength="200" />
                </template>
              </Column>

              <!-- JM -->
              <Column field="unit" class="min-w-16" bodyStyle="text-align: center; cursor: pointer">
                <template #header>
                  <div class="w-full" style="text-align: center">Jm</div>
                </template>
                <template #editor="{ data, field }">
                  <InputText v-model="data[field]" fluid maxlength="10" />
                </template>
              </Column>

              <!-- QUANTITY -->
              <Column field="quantity" class="min-w-16" bodyStyle="text-align: center; cursor: pointer">
                <template #header>
                  <div class="w-full" style="text-align: center">Ilość</div>
                </template>
                <template #editor="{ data, field }">
                  <InputNumber
                    v-model="data[field]"
                    :min="0"
                    mode="decimal"
                    :maxFractionDigits="2"
                    fluid
                    @focus="UtilsService.selectText"
                  />
                </template>
              </Column>

              <!-- AMOUNT NET-->
              <Column field="amount" class="min-w-16" bodyStyle="text-align: center; cursor: pointer">
                <template #header>
                  <div class="w-full" style="text-align: center">Kwota</div>
                </template>
                <template #body="{ data }">
                  <div style="text-align: center">
                    {{ UtilsService.formatCurrency(data.amount) }}
                  </div>
                </template>
                <template #editor="{ data, field }">
                  <InputNumber v-model="data[field]" mode="currency" currency="PLN" locale="pl-PL" fluid @focus="UtilsService.selectText" />
                </template>
              </Column>

              <!-- TOTAL AMOUNT NETT-->
              <Column field="amount" class="min-w-16" bodyStyle="text-align: center">
                <template #header>
                  <div class="w-full" style="text-align: center">Razem</div>
                </template>
                <template #body="{ data }">
                  <div style="text-align: center">
                    {{ UtilsService.formatCurrency(data.amount * data['quantity']) }}
                  </div>
                </template>
              </Column>
              <template #empty>
                <span class="text-red-500">Uzupełnij dane..</span>
              </template>

              <!--          DELETE         -->
              <Column :exportable="false" style="width: 6rem" bodyStyle="text-align: center">
                <template #header>
                  <div class="w-full" style="text-align: center">Akcja</div>
                </template>
                <template #body="slotProps">
                  <div class="flex flex-row gap-1 justify-center">
                    <OfficeIconButton
                      title="Usuń pozycję."
                      class="text-red-500"
                      icon="pi pi-trash"
                      @click="confirmDeleteItem(slotProps.data, slotProps.index)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <div class="invoice-items-summary flex justify-end mt-4 pt-4 border-t border-surface-500 dark:border-surface-400">
              <p class="font-bold text-xl">RAZEM: {{ totalAmount }}</p>
            </div>
          </Fieldset>
        </div>

        <Fieldset
          v-if="isVatGroupRecipient"
          class="mt-4 w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700"
          legend="Odbiorca grupy VAT (GV)"
        >
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="min-w-0 sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="gv-recipient-customer">
                Wybierz odbiorcę z listy klientów
              </label>
              <Select
                id="gv-recipient-customer"
                v-model="vatGroupRecipientCustomer"
                class="w-full"
                :options="customerStore.getCustomerActive"
                :option-label="getCustomerLabel"
                placeholder="Opcjonalnie — uzupełni pola poniżej"
                show-clear
                :loading="customerStore.loadingCustomer"
              />
            </div>

            <div class="min-w-0">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="vatGroupRecipientName">Nazwa odbiorcy</label>
              <InputText
                id="vatGroupRecipientName"
                v-model="invoice.vatGroupRecipientName"
                fluid
                maxlength="200"
                :invalid="isVatGroupRecipientNameInvalid"
              />
              <small class="p-error block min-h-[1.25rem] text-red-500">
                {{ isVatGroupRecipientNameInvalid ? 'Pole jest wymagane.' : '\u00a0' }}
              </small>
            </div>

            <div class="min-w-0">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="vatGroupRecipientNip">NIP</label>
              <InputText
                id="vatGroupRecipientNip"
                v-model="invoice.vatGroupRecipientNip"
                fluid
                maxlength="13"
                :invalid="isVatGroupRecipientNipInvalid"
              />
              <small class="p-error block min-h-[1.25rem] text-red-500">
                {{ isVatGroupRecipientNipInvalid ? 'NIP musi składać się z 10 cyfr.' : '\u00a0' }}
              </small>
            </div>

            <div class="min-w-0">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="vatGroupRecipientStreet">Ulica</label>
              <InputText
                id="vatGroupRecipientStreet"
                v-model="invoice.vatGroupRecipientStreet"
                fluid
                maxlength="200"
                :invalid="isVatGroupRecipientStreetInvalid"
              />
              <small class="p-error block min-h-[1.25rem] text-red-500">
                {{ isVatGroupRecipientStreetInvalid ? 'Pole jest wymagane.' : '\u00a0' }}
              </small>
            </div>

            <div class="min-w-0">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="vatGroupRecipientZip">Kod pocztowy</label>
              <InputText
                id="vatGroupRecipientZip"
                v-model="invoice.vatGroupRecipientZip"
                fluid
                maxlength="10"
                :invalid="isVatGroupRecipientZipInvalid"
              />
              <small class="p-error block min-h-[1.25rem] text-red-500">
                {{ isVatGroupRecipientZipInvalid ? 'Pole jest wymagane.' : '\u00a0' }}
              </small>
            </div>

            <div class="min-w-0">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="vatGroupRecipientCity">Miasto</label>
              <InputText
                id="vatGroupRecipientCity"
                v-model="invoice.vatGroupRecipientCity"
                fluid
                maxlength="100"
                :invalid="isVatGroupRecipientCityInvalid"
              />
              <small class="p-error block min-h-[1.25rem] text-red-500">
                {{ isVatGroupRecipientCityInvalid ? 'Pole jest wymagane.' : '\u00a0' }}
              </small>
            </div>

            <div class="min-w-0 sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="buyerContactEmail">
                E-mail osoby zamawiającej
              </label>
              <InputText
                id="buyerContactEmail"
                v-model="invoice.buyerContactEmail"
                type="email"
                fluid
                maxlength="200"
                :invalid="isBuyerContactEmailInvalid"
              />
              <small class="block text-surface-500 dark:text-surface-400 mt-1">
                Adres mailowy osoby zamawiającej usługę lub kupującej towar.
              </small>
              <small class="p-error block min-h-[1.25rem] text-red-500">
                {{ isBuyerContactEmailInvalid ? 'Podaj poprawny adres e-mail.' : '\u00a0' }}
              </small>
            </div>
          </div>
        </Fieldset>
      </Panel>
    </form>
  </div>
</template>
<style scoped>
  :deep(.p-panel-header) {
    padding-bottom: 0;
  }
</style>
<style>
  /* Light mode hover styles - only for invoice items table */
  .invoice-items-table .p-datatable-tbody > tr > td:nth-child(1):hover,
  .invoice-items-table .p-datatable-tbody > tr > td:nth-child(2):hover,
  .invoice-items-table .p-datatable-tbody > tr > td:nth-child(3):hover,
  .invoice-items-table .p-datatable-tbody > tr > td:nth-child(4):hover {
    background-color: rgb(220 252 231) !important; /* green-100 */
  }

  /* Dark mode hover styles - only for invoice items table */
  html.dark .invoice-items-table .p-datatable-tbody > tr > td:nth-child(1):hover,
  html.dark .invoice-items-table .p-datatable-tbody > tr > td:nth-child(2):hover,
  html.dark .invoice-items-table .p-datatable-tbody > tr > td:nth-child(3):hover,
  html.dark .invoice-items-table .p-datatable-tbody > tr > td:nth-child(4):hover {
    background-color: rgb(5 46 22) !important; /* green-950 */
  }
</style>
