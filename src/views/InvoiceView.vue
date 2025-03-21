<script setup lang="ts">
import {useCustomerStore} from "@/stores/customers";
import {useInvoiceStore} from "@/stores/invoices";
import {useRoute} from "vue-router";
import {computed, onMounted, ref, watch} from "vue";
import {type Customer} from "@/types/Customer";
import {type Invoice, type InvoiceItem, PaymentMethod, PaymentStatus} from "@/types/Invoice";
import moment from "moment";
import OfficeButton from "@/components/OfficeButton.vue";
import {useToast} from "primevue/usetoast";
import TheMenu from "@/components/TheMenu.vue";
import router from "@/router";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import OfficeIconButton from "@/components/OfficeIconButton.vue";
import {UtilsService} from "@/service/UtilsService.ts";
import type {DataTableCellEditCompleteEvent} from "primevue";
import type {AxiosError} from "axios";

const customerStore = useCustomerStore();
const invoiceStore = useInvoiceStore();
const route = useRoute();

const toast = useToast();
const invoice = ref<Invoice>({
  idInvoice: 0,
  customer: null,
  invoiceNumber: "",
  sellDate: new Date(),
  invoiceDate: new Date(),
  paymentMethod: PaymentMethod.TRANSFER,
  paymentStatus: PaymentStatus.TO_PAY,
  paymentDeadline: 14,
  paymentDate: null,
  otherInfo: "",
  invoiceItems: [],
});

const invoiceItem = ref<InvoiceItem>({
  idInvoice: 0,
  unit: "",
  id: 0,
  amount: 0,
  name: "",
  quantity: 0,
});
const invoiceNumber = ref<number>(0);
const invoiceYear = ref<number>();
const paymentDeadline = ref<number>();
const btnShowBusy = ref<boolean>(false);
const btnSaveDisabled = ref<boolean>(false);

watch(invoiceYear, async (newValue) => {
  if (!isEdit.value && newValue)
    invoiceNumber.value = await invoiceStore.findInvoiceNumber(newValue);
})

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
  console.log("newInvoice()");
  if (!isValid()) {
    showError("Uzupełnij brakujące elementy");
  } else {
    btnSaveDisabled.value = true;
    const invoiceDate = moment(invoice.value.invoiceDate);
    invoice.value.invoiceNumber = invoiceYear.value + "/" + invoiceNumber.value;
    invoice.value.paymentDate = invoiceDate.add(paymentDeadline.value, 'day').toDate()
    await invoiceStore.addInvoiceDb(invoice.value)
        .then(() => {
          toast.add({
            severity: "success",
            summary: "Potwierdzenie",
            detail: "Zapisano fakturę nr: " + invoice.value.invoiceNumber,
            life: 3000,
          });
          setTimeout(() => {
            router.push({name: "Invoices"});
          }, 3000);
        })
        .catch((reason: AxiosError) => {
          toast.add({
            severity: "error",
            summary: "Błąd podczas zapisu faktury.",
            detail: (reason?.response?.data as { message: string }).message,
            life: 5000,
          });
          btnSaveDisabled.value = false;
        })
  }
}

//
//-----------------------------------------------------EDIT INVOICE------------------------------------------------
//
const isEdit = ref<boolean>(false);

async function editInvoice() {
  if (!isValid()) {
    showError("Uzupełnij brakujące elementy");
  } else {
    invoice.value.invoiceNumber = invoiceYear.value + "/" + invoiceNumber.value;
    btnSaveDisabled.value = true;
    await invoiceStore.updateInvoiceDb(invoice.value)
        .then(() => {
          toast.add({
            severity: "success",
            summary: "Potwierdzenie",
            detail: "Zaaktualizowano fakturę nr: " + invoice.value.invoiceNumber,
            life: 3000,
          });
          setTimeout(() => {
            router.push({name: "Invoices"});
          }, 3000);
        })
        .catch((reason: AxiosError) => {
            toast.add({
              severity: "error",
              summary: "Błąd podczas edycji faktury.",
              detail: (reason?.response?.data as { message: string }).message,
              life: 5000,
            });
          btnSaveDisabled.value = false;
        })
  }
}

//
// ---------------------------------------------------------NEW INVOICE_ITEM---------------------------------------
//
function newItem() {
  const latestItem = invoiceStore.getLatestItemForCustomer(
      invoice.value.customer?.id
  );

  if (latestItem !== null) {
    invoiceItem.value = JSON.parse(JSON.stringify(latestItem));
    invoiceItem.value.id = 0;
    invoiceItem.value.idInvoice = invoice.value.idInvoice;
    invoiceItem.value.unit = latestItem.unit;
    invoiceItem.value.name = latestItem.name;
    invoiceItem.value.amount = latestItem.amount;
    invoiceItem.value.quantity = latestItem.quantity;
  } else {
    invoiceItem.value.idInvoice = invoice.value.idInvoice;
    invoiceItem.value.unit = "l";
    invoiceItem.value.name = "Kurs języka angielskiego ";
    invoiceItem.value.amount = 0;
    invoiceItem.value.quantity = 0;

  }
  invoice.value.invoiceItems.push({...invoiceItem.value})
}

//
//------------------------------------------------- EDIT INVOICE_ITEM---------------------------------------------------
//
const onCellEditComplete = (event: DataTableCellEditCompleteEvent) => {
  let {data, newValue, field, originalEvent} = event;
  console.log("onCellEditComplete event",event);

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
  if (invoiceItem.value)
    return `Czy chcesz usunąc pozycję <b>${invoiceItem.value.name}</b>?`;
  return "No message";
});

const submitDelete = async () => {
  console.log("submitDelete()");
  if (invoiceItem.value) {
    if (invoiceDeleteItemIndex.value !== -1)
      invoice.value.invoiceItems.splice(invoiceDeleteItemIndex.value, 1);
  }
  showDeleteConfirmationDialog.value = false;
};

onMounted(() => {
  console.log("onMounted GET");
  btnSaveDisabled.value = true;
  if (customerStore.customers.length <= 1) customerStore.getCustomersFromDb("ALL");
  invoiceStore.getPaymentType();
  btnSaveDisabled.value = false;
});

onMounted(async () => {
  // console.log("onMounted EDIT", route.params);
  btnSaveDisabled.value = true;
  isEdit.value = route.params.isEdit === "true";
  if (!isEdit.value) {
    console.log("onMounted NEW INVOICE");
    const currentYear = new Date(Date.now()).getFullYear();
    invoiceNumber.value = await invoiceStore.findInvoiceNumber(currentYear);
    invoiceYear.value = currentYear;
    paymentDeadline.value = 14;
  } else {
    console.log("onMounted EDIT INVOICE");
    const invoiceId = Number(route.params.invoiceId as string);
    invoiceStore
        .getInvoiceFromDb(invoiceId)
        .then((data) => {
          if (data) {
            invoice.value = data;
            if (data.paymentDate && data.invoiceDate) {
              const paymentDate = moment(data.paymentDate);
              const invoiceDate = moment(data.invoiceDate);

              paymentDeadline.value = paymentDate.diff(invoiceDate, 'days');
            } else {
              paymentDeadline.value = 0;
            }

            invoiceNumber.value = Number(
                invoice.value.invoiceNumber.split("/")[1]
            );
            invoiceYear.value = Number(invoice.value.invoiceNumber.split("/")[0]);
          }
        })
        .catch((error) => {
          console.error("Błąd podczas pobierania faktury:", error);
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
    severity: "error",
    summary: "Error Message",
    detail: msg,
    life: 3000,
  });
};
const isValid = () => {
  return (
      invoice.value.customer !== null &&
      invoice.value.invoiceItems.length > 0 &&
      invoice.value.invoiceItems.every(item => item.quantity > 0 && item.amount > 0)
  );
};

const showErrorCustomer = () => {
  return submitted.value && invoice.value.customer === null;
};

const getCustomerLabel = (option: Customer) => {
  console.log("getCustomerLabel", option);
  return `${option.name} ${option.firstName}`;
}
</script>

<template>
  <Toast/>
  <TheMenu/>
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
          <OfficeIconButton
              title="Powrót do listy faktur"
              icon="pi pi-fw pi-table"
              @click="() => router.push({ name: 'Invoices' })"
          />
          <div class="w-full flex justify-center">
            <h3 class="">
              {{
                isEdit
                    ? `Edycja faktury nr: ${invoice.invoiceNumber}`
                    : "Nowa faktura"
              }}
            </h3>
          </div>
        </template>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Fieldset class="w-full " legend="Dane faktury">

            <!-- ROW-1   CUSTOMER -->
            <div class="flex flex-row gap-4">
              <div class="flex flex-col w-full">
                <label for="input-customer">Wybierz klienta:</label>
                <Select
                    id="input-customer"
                    v-model="invoice.customer"
                    :invalid="showErrorCustomer()"
                    :options="isEdit ? customerStore.customers : customerStore.getCustomerActive"
                    :option-label="getCustomerLabel"
                    required
                    :loading="customerStore.loadingCustomer"
                />
                <small class="p-error">{{
                    showErrorCustomer() ? "Pole jest wymagane." : "&nbsp;"
                  }}</small>
              </div>
            </div>

            <!-- ROW-2  INVOICE NUMBER/YEAR  -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <!--              <div class="col">-->
              <div class="flex flex-row gap-4">
                <div class="flex flex-col w-full ">
                  <label for="number">Numer faktury</label>
                  <InputNumber
                      id="number"
                      v-model="invoiceNumber"
                      mode="decimal"
                      show-buttons
                      :min="1"
                      :max="100"
                  />
                </div>
                <div v-if="invoiceStore.loadingInvoiceNo" class="mt-6">
                  <ProgressSpinner
                      class="mt-1"
                      style="width: 30px; height: 30px"
                      stroke-width="5"
                  />
                </div>
              </div>
              <div class="">
                <div class="flex flex-col w-full">
                  <label for="year">Rok faktury</label>
                  <InputNumber
                      id="year"
                      v-model="invoiceYear"
                      mode="decimal"
                      :use-grouping="false"
                      show-buttons
                      :min="2020"
                      :max="2050"
                  />
                </div>
              </div>
            </div>

            <!-- ROW-3  DATES  -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:mt-4">
              <div class="flex flex-col w-full mt-4 sm:mt-0">
                <label for="input">Data wystawienia:</label>
                <Calendar
                    v-model="invoice.invoiceDate"
                    show-icon
                    date-format="yy-mm-dd"
                />
              </div>
              <div class="flex flex-col w-full">
                <label for="input">Data sprzedaży:</label>
                <Calendar
                    v-model="invoice.sellDate"
                    show-icon
                    date-format="yy-mm-dd"
                />
              </div>
            </div>

            <!-- ROW-4  LATE PAYMENT, PAYMENT_TYPE  -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:mt-4">
              <div class="flex flex-col w-full mt-4 sm:mt-0">
                <label for="input">Odroczenie płatności:</label>
                <InputNumber
                    id="input"
                    v-model="paymentDeadline"
                    mode="decimal"
                    :use-grouping="false"
                    show-buttons
                    :min="0"
                    :max="90"
                />
              </div>
              <div class="flex flex-row gap-4">
                <div class="flex flex-col w-full">
                  <label for="input-customer">Forma płatności:</label>
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

            <!-- ROW-5  OTHER INFO  -->
            <div class="flex-row flex mt-4">
              <!--              <div class="col">-->
              <div class="flex flex-col col-12 w-full">
                <label for="input">Dodatkowe informacje:</label>
                <Textarea v-model="invoice.otherInfo" rows="4" cols="30" fluid/>
              </div>
              <!--              </div>-->
            </div>
          </Fieldset>

          <!-- TABLE INVOIS_ITEMS -->
          <Fieldset class="w-full " legend="Pozycje na fakturze">
            <DataTable :value="invoice.invoiceItems" class="pt-2" size="small"
                       editMode="cell" dataKey="id" @cell-edit-complete="onCellEditComplete">
              <template #header>
                <!--        input do filtrowania na razie tutaj. Potem przenieść do navbaru-->
                <div class="flex justify-between">
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
              <Column field="name" header="Nazwa"
                      class="min-w-52 hover:cursor-pointer dark:hover:bg-green-950 hover:bg-green-100">
                <template #editor="{ data, field }">
                  <InputText v-model="data[field]" fluid maxlength="200"/>
                </template>
              </Column>

              <!-- JM -->
              <Column field="unit" header="Jm"
                      class="min-w-16 hover:cursor-pointer dark:hover:bg-green-950 hover:bg-green-100">
                <template #editor="{ data, field }">
                  <InputText v-model="data[field]" fluid maxlength="10"/>
                </template>
              </Column>


              <!-- QUANTITY -->
              <Column field="quantity" header="Ilość"
                      class="min-w-16 hover:cursor-pointer dark:hover:bg-green-950 hover:bg-green-100">
                <template #editor="{ data, field }">
                  <InputNumber v-model="data[field]" :min="0" mode="decimal" :maxFractionDigits="2" fluid @focus="UtilsService.selectText"/>
                </template>
              </Column>


              <!-- AMOUNT NET-->
              <Column field="amount" header="Kwota"
                      class="min-w-16 hover:cursor-pointer dark:hover:bg-green-950 hover:bg-green-100">
                <template #body="{ data }">
                  <div style="text-align: center">
                    {{ UtilsService.formatCurrency(data.amount) }}
                  </div>
                </template>
                <template #editor="{ data, field }">
                  <InputNumber v-model="data[field]" mode="currency" currency="PLN" locale="pl-PL" fluid
                               @focus="UtilsService.selectText"/>
                </template>
              </Column>


              <!-- TOTAL AMOUNT NETT-->
              <Column field="amount" header="Razem" class="min-w-16">
                <template #body="{ data }">
                  {{
                    UtilsService.formatCurrency(data.amount * data["quantity"])
                  }}
                </template>
              </Column>
              <template #empty>
                <span class="text-red-500">Uzupełnij dane..</span>
              </template>

              <!--                EDIT, DELETE-->
              <Column
                  header="Akcja"
                  :exportable="false"
                  style="min-width: 6rem"
              >
                <template #body="slotProps">
                  <div class="flex flex-row gap-1 justify-content-evenly">
                    <OfficeIconButton
                        title="Usuń pozycję."
                        icon="pi pi-trash"
                        severity="danger"
                        @click="
                        confirmDeleteItem(slotProps.data, slotProps.index)
                      "
                    />
                  </div>
                </template>
              </Column>
              <ColumnGroup type="footer">
                <Row>
                  <Column
                      :colspan="5"
                      footer-style="text-align:right; padding-right: 8px;"
                  >
                    <template #footer>
                      <p class="font-semibold">RAZEM:</p>
                    </template>
                  </Column>
                  <Column footer-style="padding-left: 0">
                    <template #footer>
                      <p class="">
                        {{ totalAmount }}
                      </p>
                    </template>
                  </Column>
                </Row>
              </ColumnGroup>
            </DataTable>
          </Fieldset>
        </div>

        <!-- ROW-6  BTN SAVE -->
        <div class="flex justify-center mt-6">
          <OfficeButton
              text="zapisz"
              btn-type="office-save"
              type="submit"
              :loading="btnShowBusy"
              :btn-disabled="isSaveBtnDisabled"
          />
        </div>
      </Panel>
    </form>
  </div>
</template>

<style scoped></style>
