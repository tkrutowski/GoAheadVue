<script setup lang="ts">
import { useCustomerStore } from "@/stores/customers";
import { useInvoiceStore } from "@/stores/invoices";
import { useRoute } from "vue-router";
import { computed, onMounted, ref, watch } from "vue";
import { Customer } from "@/assets/types/Customer";
import { Invoice, InvoiceItem } from "@/assets/types/Invoice";
import moment from "moment";
import OfficeButton from "@/components/OfficeButton.vue";
import AddInvoiceItemDialog from "@/components/AddEditInvoiceItemDialog.vue";
import { useToast } from "primevue/usetoast";
import EditButton from "@/components/EditButton.vue";
import DeleteButton from "@/components/DeleteButton.vue";
import TheMenu from "@/components/TheMenu.vue";
import router from "@/router";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import IconButton from "@/components/IconButton.vue";

const customerStore = useCustomerStore();
const invoiceStore = useInvoiceStore();
const route = useRoute();

const toast = useToast();
const selectedCustomer = ref<Customer>();
const showNewItemModal = ref(false);
const invoice = ref<Invoice>({
  idInvoice: 0,
  idCustomer: 0,
  invoiceNumber: "",
  sellDate: new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split(".")
    .reverse()
    .join("-"),
  invoiceDate: new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split(".")
    .reverse()
    .join("-"),
  paymentMethod: { name: "TRANSFER", viewName: "przelew" },
  paymentStatus: { name: "TO_PAY", viewName: "Do zapłaty" },
  paymentDeadline: 14,
  paymentDate: "",
  otherInfo: "",
  invoiceItems: [],
  customerName: "",
});

const invoiceItem = ref<InvoiceItem>({
  idInvoice: 0,
  jm: "",
  id: 0,
  amount: 0,
  name: "",
  quantity: 0,
});
const invoiceNumber = ref<number>(0);
const invoiceYear = ref<number>();
const paymentLate = ref<number>();
const btnShowError = ref<boolean>(false);
const btnShowBusy = ref<boolean>(false);
const btnShowOk = ref<boolean>(false);
const btnSaveDisabled = ref<boolean>(false);

const formatCurrency = (value: number) => {
  return value.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
};
const totalAmount = computed(() => {
  let total = invoice.value.invoiceItems.reduce((acc, item) => {
    return acc + item.quantity * item.amount;
  }, 0);
  return formatCurrency(total);
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
const invoiceDateTemp = ref<string>("");
watch(invoiceDateTemp, (newDate: string) => {
  invoice.value.invoiceDate = moment(new Date(newDate)).format("YYYY-MM-DD");
});
const sellDateTemp = ref<string>("");
watch(sellDateTemp, (newDate: string) => {
  invoice.value.sellDate = moment(new Date(newDate)).format("YYYY-MM-DD");
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
    btnShowError.value = true;
    setTimeout(() => (btnShowError.value = false), 5000);
  } else {
    btnSaveDisabled.value = true;
    invoice.value.invoiceNumber = invoiceYear.value + "/" + invoiceNumber.value;

    const result = await invoiceStore.addInvoiceDb(invoice.value);

    if (result) {
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail: "Zapisano fakturę nr: " + invoice.value.invoiceNumber,
        life: 3000,
      });
      btnShowOk.value = true;
      setTimeout(() => {
        router.push({ name: "Invoices" });
      }, 3000);
    } else btnShowError.value = true;

    // btnSaveDisabled.value = false;
    setTimeout(() => {
      btnShowError.value = false;
      btnShowOk.value = false;
    }, 5000);
  }
}

//
//-----------------------------------------------------EDIT INVOICE------------------------------------------------
//
const isEdit = ref<boolean>(false);
const isEditItem = ref<boolean>(false);
const editItemIndex = ref<number>(-1);
async function editInvoice() {
  if (!isValid()) {
    showError("Uzupełnij brakujące elementy");
    btnShowError.value = true;
    setTimeout(() => (btnShowError.value = false), 5000);
  } else {
    invoice.value.invoiceNumber = invoiceYear.value + "/" + invoiceNumber.value;
    btnSaveDisabled.value = true;
    console.log("editInvoice()");
    const result: boolean = await invoiceStore.updateInvoiceDb(invoice.value);

    if (result) {
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail: "Zaaktualizowano fakturę nr: " + invoice.value.invoiceNumber,
        life: 3000,
      });
      btnShowOk.value = true;
      setTimeout(() => {
        router.push({ name: "Invoices" });
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

//
// ---------------------------------------------------------NEW INVOICE_ITEM---------------------------------------
//
function newItem() {
  const latestItem = invoiceStore.getLatestItemForCustomer(
    invoice.value.idCustomer
  );
  if (latestItem) {
    invoiceItem.value = latestItem;
    invoiceItem.value.idInvoice = invoice.value.idInvoice;
    invoiceItem.value.jm = latestItem.jm;
    invoiceItem.value.name = latestItem.name;
    invoiceItem.value.amount = latestItem.amount;
    invoiceItem.value.quantity = latestItem.quantity;
  } else {
    invoiceItem.value.idInvoice = invoice.value.idInvoice;
    invoiceItem.value.jm = "l";
    invoiceItem.value.name = "Kurs języka angielskiego ";
    invoiceItem.value.amount = 0;
    invoiceItem.value.quantity = 0;

    invoiceItem.value = JSON.parse(JSON.stringify(invoiceItem.value));
  }
  isEditItem.value = false;
  showNewItemModal.value = true;
}
//
//------------------------------------------------- EDIT INVOICE_ITEM---------------------------------------------------
//
const editItem = (item: InvoiceItem, index: number) => {
  invoiceItem.value = JSON.parse(JSON.stringify(item));
  editItemIndex.value = index;
  isEditItem.value = true;
  showNewItemModal.value = true;
};

function saveInvoiceItem(item: InvoiceItem) {
  if (isEditItem.value && editItemIndex.value != -1) {
    invoice.value.invoiceItems[editItemIndex.value] = { ...item };
  } else {
    // invoice.value.invoiceItems.push(JSON.parse(JSON.stringify(item)));
    invoice.value.invoiceItems.push({ ...item });
  }
  //reset
  resetEditItem();
  showNewItemModal.value = false;
}

function resetEditItem() {
  invoiceItem.value.jm = "l";
  invoiceItem.value.name = "Kurs języka angielskiego ";
  invoiceItem.value.amount = 0;
  invoiceItem.value.quantity = 0;
  invoiceItem.value.id = 0;
  invoiceItem.value.idInvoice = 0;
  isEditItem.value = false;
}

//
// ADD/EDIT INVOICEITEM MODAL
function hideNewItemModal() {
  //reset
  resetEditItem();
  showNewItemModal.value = false;
}

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
  customerStore.getCustomersFromDb("ALL", false);
  invoiceStore.getPaymentType();
  btnSaveDisabled.value = false;
});

onMounted(async () => {
  // console.log("onMounted EDIT", route.params);
  btnSaveDisabled.value = true;
  isEdit.value = route.params.isEdit === "true";
  if (isEdit.value === false) {
    console.log("onMounted NEW INVOICE");
    const currentYear = new Date(Date.now()).getFullYear();
    invoiceNumber.value = await invoiceStore.findInvoiceNumber(currentYear);
    invoiceYear.value = currentYear;
    paymentLate.value = 14;
    invoiceDateTemp.value = invoice.value.invoiceDate;
    sellDateTemp.value = invoice.value.sellDate;
  } else {
    console.log("onMounted EDIT INVOICE");
    const invoiceId = Number(route.params.invoiceId as string);
    invoiceStore
      .getInvoiceFromDb(invoiceId)
      .then((data) => {
        if (data) {
          invoice.value = data;
          selectedCustomer.value = customerStore.getCustomerById(
            invoice.value.idCustomer
          );
          invoiceNumber.value = Number(
            invoice.value.invoiceNumber.split("/")[1]
          );
          invoiceYear.value = Number(invoice.value.invoiceNumber.split("/")[0]);
          paymentLate.value = invoice.value.paymentDeadline;
          invoiceDateTemp.value = invoice.value.invoiceDate;
          sellDateTemp.value = invoice.value.sellDate;
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
  return invoice.value.idCustomer > 0 && invoice.value.invoiceItems.length > 0;
};
const showErrorCustomer = () => {
  return submitted.value && invoice.value.idCustomer <= 0;
};
</script>

<template>
  <Toast />
  <TheMenu />
  <AddInvoiceItemDialog
    v-model:visible="showNewItemModal"
    :item="invoiceItem"
    :is-edit="isEditItem"
    @save="saveInvoiceItem"
    @cancel="hideNewItemModal"
  />

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
          <IconButton
            v-tooltip.right="{
              value: 'Powrót do listy faktur',
              showDelay: 500,
              hideDelay: 300,
            }"
            icon="pi-fw pi-list"
            @click="() => router.push({ name: 'Invoices' })"
          />
          <div class="w-full flex justify-content-center">
            <h3 class="color-green">
              {{
                isEdit
                  ? `Edycja faktury nr: ${invoice.invoiceNumber}`
                  : "Nowa faktura"
              }}
            </h3>
          </div>
        </template>
        <div class="flex flex-row grid">
          <div class="flex flex-column col-12 col-xl-6">
            <!-- ROW-1   CUSTOMER -->
            <div class="row">
              <div class="col">
                <div class="flex flex-row">
                  <div class="flex flex-column col-12">
                    <label for="input-customer">Wybierz klienta:</label>
                    <Dropdown
                      id="input-customer"
                      v-model="selectedCustomer"
                      :class="{ 'p-invalid': showErrorCustomer() }"
                      :options="customerStore.customers"
                      option-label="name"
                      :onchange="
                        (invoice.idCustomer = selectedCustomer
                          ? selectedCustomer.id
                          : 0)
                      "
                      required
                    />
                    <small class="p-error">{{
                      showErrorCustomer() ? "Pole jest wymagane." : "&nbsp;"
                    }}</small>
                  </div>
                  <div v-if="customerStore.loadingCustomer" class="mt-4">
                    <ProgressSpinner
                      class="ml-2 mt-1"
                      style="width: 40px; height: 40px"
                      stroke-width="5"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- ROW-2  INVOICE NUMBER/YEAR  -->
            <div class="flex-row flex grid">
              <!--              <div class="col">-->
              <!--                <div class="flex flex-row">-->
              <div class="flex flex-column col-12 col-md-6">
                <label for="number">Numer faktury</label>
                <InputNumber
                  id="number"
                  v-model="invoiceNumber"
                  class="border-green"
                  mode="decimal"
                  show-buttons
                  :min="1"
                  :max="100"
                />
              </div>
              <div v-if="invoiceStore.loadingInvoiceNo" class="mt-4">
                <ProgressSpinner
                  class="ml-2 mt-1"
                  style="width: 40px; height: 40px"
                  stroke-width="5"
                />
              </div>
              <!--                </div>-->
              <!--              </div>-->
              <!--              <div class="col">-->
              <div class="flex flex-column col-12 col-md-6">
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
              <!--              </div>-->
            </div>

            <!-- ROW-3  DATES  -->
            <div class="flex-row flex grid">
              <div class="flex flex-column col-12 col-md-6">
                <label for="input">Data wystawienia:</label>
                <Calendar
                  v-model="invoiceDateTemp"
                  show-icon
                  date-format="yy-mm-dd"
                />
              </div>
              <div class="flex flex-column col-12 col-md-6">
                <label for="input">Data sprzedaży:</label>
                <Calendar
                  v-model="sellDateTemp"
                  show-icon
                  date-format="yy-mm-dd"
                />
              </div>
            </div>

            <!-- ROW-4  LATE PAYMENT, PAYMENT_TYPE  -->
            <div class="flex flex-row grid">
              <div class="flex flex-column col-12 col-md-6">
                <label for="input">Odroczenie płatności:</label>
                <InputNumber
                  id="input"
                  v-model="paymentLate"
                  class="border-green"
                  mode="decimal"
                  :use-grouping="false"
                  show-buttons
                  :min="0"
                  :max="90"
                />
              </div>
              <div class="flex flex-column col-12 col-md-6">
                <label for="input-customer">Forma płatności:</label>
                <Dropdown
                  id="input-customer"
                  v-model="invoice.paymentMethod"
                  class="border-green"
                  :options="invoiceStore.paymentTypes"
                  option-label="viewName"
                  required
                />
                <div v-if="invoiceStore.loadingPaymentType" class="mt-4">
                  <ProgressSpinner
                    class="ml-2 mt-1"
                    style="width: 40px; height: 40px"
                    stroke-width="5"
                  />
                </div>
              </div>
            </div>

            <!-- ROW-5  OTHER INFO  -->
            <div class="flex-row flex grid">
              <!--              <div class="col">-->
              <div class="flex flex-column col-12">
                <label for="input">Dodatkowe informacje:</label>
                <Textarea v-model="invoice.otherInfo" rows="5" cols="30" />
              </div>
              <!--              </div>-->
            </div>
          </div>

          <!-- TABLE INVOIS_ITEMS -->
          <div class="flex flex-column col-12 col-xl-6">
            <DataTable :value="invoice.invoiceItems" class="border-green pt-2">
              <template #header>
                <!--        input do filtrowania na razie tutaj. Potem przenieść do navbaru-->
                <div class="flex justify-content-sm-between">
                  <OfficeButton
                    v-tooltip.top="{
                      value: 'Podaj nową pozycję do faktury.',
                      showDelay: 1000,
                      hideDelay: 300,
                    }"
                    text="Dodaj"
                    btn-type="ahead"
                    type="button"
                    @click="newItem"
                  />
                </div>
              </template>
              <Column field="name" header="Nazwa" />
              <Column field="jm" header="Jm" />
              <Column field="quantity" header="Ilość" />
              <Column field="amount" header="Kwota">
                <template #body="{ data, field }">
                  <div style="text-align: center">
                    {{ formatCurrency(data[field]) }}
                  </div>
                </template>
              </Column>
              <Column field="amount" header="Razem">
                <template #body="slotProps">
                  {{
                    formatCurrency(
                      slotProps.data[slotProps.field] *
                        slotProps.data["quantity"]
                    )
                  }}
                </template>
              </Column>
              <template #empty>
                <span class="color-red">Uzupełnij dane..</span>
              </template>

              <!--                EDIT, DELETE-->
              <Column
                header="Akcja"
                :exportable="false"
                style="min-width: 6rem"
              >
                <template #body="slotProps">
                  <div class="flex flex-row gap-1 justify-content-evenly">
                    <EditButton
                      v-tooltip.top="{
                        value: 'Edytuj pozycję.',
                        showDelay: 1000,
                        hideDelay: 300,
                      }"
                      @click="editItem(slotProps.data, slotProps.index)"
                    />
                    <DeleteButton
                      v-tooltip.top="{
                        value: 'Usuń pozycję.',
                        showDelay: 1000,
                        hideDelay: 300,
                      }"
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
                      <h5 class="color-green">RAZEM:</h5>
                    </template>
                  </Column>
                  <Column footer-style="padding-left: 0">
                    <template #footer>
                      <h5 class="color-green">
                        {{ totalAmount }}
                      </h5>
                    </template>
                  </Column>
                </Row>
              </ColumnGroup>
            </DataTable>
          </div>
        </div>

        <!-- ROW-6  BTN SAVE -->
        <div class="flex flex-row">
          <div class="flex col justify-content-center">
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
        </div>
      </Panel>
    </form>
  </div>
</template>

<style scoped></style>
