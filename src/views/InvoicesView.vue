<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import {FilterMatchMode, FilterOperator} from '@primevue/core/api';
import {type Invoice, PaymentStatus} from "@/types/Invoice";
import OfficeButton from "@/components/OfficeButton.vue";
import TheMenu from "@/components/TheMenu.vue";
import router from "@/router";
import StatusButton from "@/components/StatusButton.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import {useToast} from "primevue/usetoast";
import {useCustomerStore} from "@/stores/customers";
import {useInvoiceStore} from "@/stores/invoices";
import {type Customer} from "@/types/Customer.ts";
import {UtilsService} from "../service/UtilsService.ts";
import {AxiosError} from "axios";
import {TranslationService} from "../service/TranslationService.ts";
import OfficeIconButton from "@/components/OfficeIconButton.vue";
import {FinanceService} from "../service/FinanceService.ts";
import type {DataTablePageEvent} from "primevue";

const customerStore = useCustomerStore();

const invoiceStore = useInvoiceStore();
const toast = useToast();

//filter
const filters = ref();
const initFilters = () => {
  filters.value = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
    customer: {value: null, matchMode: FilterMatchMode.IN},
    sellDate: {operator: FilterOperator.AND, constraints: [{value: null, matchMode: FilterMatchMode.DATE_IS}]},
    invoiceDate: {operator: FilterOperator.AND, constraints: [{value: null, matchMode: FilterMatchMode.DATE_IS}]},
    paymentDate: {operator: FilterOperator.AND, constraints: [{value: null, matchMode: FilterMatchMode.DATE_IS}]},
    amount: {operator: FilterOperator.AND, constraints: [{value: null, matchMode: FilterMatchMode.EQUALS}]},
    invoiceNumber: {value: null, matchMode: FilterMatchMode.CONTAINS},

  };
}
initFilters();
const clearFilter = () => {
  initFilters();
};

const expandedRows = ref([]);
const invoiceTemp = ref<Invoice>();
//
//---------------------------------------------STATUS CHANGE--------------------------------------------------
//
const showStatusChangeConfirmationDialog = ref<boolean>(false);
const confirmStatusChange = (invoice: Invoice) => {
  invoiceTemp.value = invoice;
  showStatusChangeConfirmationDialog.value = true;
};
const changeStatusConfirmationMessage = computed(() => {
  if (invoiceTemp.value)
    return `Czy chcesz zmienić status faktury nr <b>${
        invoiceTemp.value.invoiceNumber
    }</b> na <b>${
        invoiceTemp.value.paymentStatus === PaymentStatus.PAID
            ? "Do zapłaty"
            : "Zapłacony"
    }</b>?`;
  return "No message";
});
const submitChangeStatus = async () => {
  console.log("submitChangeStatus()");
  if (invoiceTemp.value) {
    let newStatus: PaymentStatus = invoiceTemp.value.paymentStatus === "PAID" ? PaymentStatus.TO_PAY : PaymentStatus.PAID;
    await invoiceStore.updateInvoiceStatusDb(invoiceTemp.value.idInvoice, newStatus)
        .then(() => {
          toast.add({
            severity: "success",
            summary: "Potwierdzenie",
            detail:
                "Zaaktualizowano status faktury nr: " +
                invoiceTemp.value?.invoiceNumber,
            life: 3000,
          });
        })
        .catch((reason: AxiosError) => {
          toast.add({
            severity: "error",
            summary: reason.message,
            detail: "Błąd podczas aktualizacji statusu faktury nr: " +
                invoiceTemp.value?.invoiceNumber,
            life: 5000,
          });
        })
  }

  showStatusChangeConfirmationDialog.value = false;
};

//
//-------------------------------------------------DELETE INVOICE-------------------------------------------------
//
const showDeleteConfirmationDialog = ref<boolean>(false);
const confirmDeleteInvoice = (invoice: Invoice) => {
  invoiceTemp.value = invoice;
  showDeleteConfirmationDialog.value = true;
};
const deleteConfirmationMessage = computed(() => {
  if (invoiceTemp.value)
    return `Czy chcesz usunąc fakturę nr <b>${invoiceTemp.value.invoiceNumber}</b>?`;
  return "No message";
});
const submitDelete = async () => {
  console.log("submitDelete()");
  if (invoiceTemp.value) {
    await invoiceStore.deleteInvoiceDb(invoiceTemp.value.idInvoice)
        .then(() => {
          toast.add({
            severity: "success",
            summary: "Potwierdzenie",
            detail: "Usunięto fakturę nr: " + invoiceTemp.value?.invoiceNumber,
            life: 3000,
          });
        })
        .catch(() => {
          toast.add({
            severity: "error",
            summary: "Błąd",
            detail: "Nie usunięto faktury nr: " + invoiceTemp.value?.invoiceNumber,
            life: 3000,
          });
        })
    showDeleteConfirmationDialog.value = false;
  }
}

//
//-------------------------------------------------CREATE PDF-------------------------------------------------
//
const downloadPdf = (idInvoice: number, invoiceNumber: string) => {
  console.log("START - downloadPdf for ", invoiceNumber)
  invoiceStore.getInvoicePdfFromDb(idInvoice)
      .then(response => {
        const fileURL = window.URL.createObjectURL(new Blob([response.data]));
        const fileLink = document.createElement("a");
        fileLink.href = fileURL;
        fileLink.setAttribute("download", "faktura_" + invoiceNumber + ".pdf");
        document.body.appendChild(fileLink);
        // this.btnDisabled = false;
        fileLink.click();
      })
      .catch(() => {
        toast.add({
          severity: "error",
          summary: "Błąd",
          detail: "Nie udało się utworzyć PDF dla faktury nr: " + invoiceNumber,
          life: 3000,
        });
      });
}


//
//-------------------------------------------------EDIT INVOICE-------------------------------------------------
//
const editItem = (item: Invoice) => {
  const invoiceItem: Invoice = JSON.parse(JSON.stringify(item));
  router.push({
    name: "Invoice",
    params: {isEdit: "true", invoiceId: invoiceItem.idInvoice},
  });
};

onMounted( () => {
  if (customerStore.customers.length <=1 ) customerStore.getCustomersFromDb("ALL");
  if (invoiceStore.invoices.length <= 1) invoiceStore.getInvoicesFromDb("ALL");
});

const handleRowsPerPageChange = (event: DataTablePageEvent) => {
  localStorage.setItem("rowsPerPageInvoice", event.rows.toString());
};

const getCustomerLabel = (customer: Customer) => {
  return `${customer.name} ${customer.firstName}`;
}


const dataTableRef = ref(null);
</script>
<template>
  <TheMenu/>
  <ConfirmationDialog
      v-model:visible="showStatusChangeConfirmationDialog"
      :msg="changeStatusConfirmationMessage"
      @save="submitChangeStatus"
      @cancel="showStatusChangeConfirmationDialog = false"
  />

  <ConfirmationDialog
      v-model:visible="showDeleteConfirmationDialog"
      :msg="deleteConfirmationMessage"
      label="Usuń"
      @save="submitDelete"
      @cancel="showDeleteConfirmationDialog = false"
  />

  <Panel>
    <template #header>
      <div class="w-full flex justify-center gap-4">
        <div v-if="invoiceStore.loadingInvoices">
          <ProgressSpinner
              class="ml-3"
              style="width: 35px; height: 35px"
              stroke-width="5"
          />
        </div>
      </div>
    </template>
    <DataTable
        ref="dataTableRef"
        v-if="!invoiceStore.loadingInvoices"
        v-model:expanded-rows="expandedRows"
        v-model:filters="filters"
        :value="invoiceStore.invoices"
        :loading="invoiceStore.loadingInvoices"
        striped-rows
        removable-sort
        paginator
        sort-field="invoiceNumber"
        :sort-order="-1"
        :rows="invoiceStore.rowsPerPage"
        :rows-per-page-options="[5, 10, 20, 50]"
        table-style="min-width: 50rem"
        filter-display="menu"
        :global-filter-fields="['customer.name', 'invoiceNumber', 'sellDate']"
        @page="handleRowsPerPageChange"
        size="small"
    >
      <template #header>
        <div class="flex justify-between">
          <router-link
              :to="{ name: 'Invoice', params: { isEdit: 'false', invoiceId: 0 } }"
              style="text-decoration: none"
          >
            <OfficeButton text="Nowa faktura" btn-type="office-regular"/>
          </router-link>
          <div class="flex gap-4">
            <IconField icon-position="left">
              <InputIcon>
                <i class="pi pi-search"/>
              </InputIcon>
              <InputText
                  v-model="filters['global'].value"
                  placeholder="wpisz tutaj..."
              />
            </IconField>
            <Button
                type="button"
                icon="pi pi-filter-slash"
                outlined size="small"
                title="Wyczyść filtry"
                @click="clearFilter()"
            />
          </div>
        </div>
      </template>

      <template #empty>
        <h4 class="color-red" v-if="!invoiceStore.loadingInvoices">
          Nie znaleziono faktur...
        </h4>
      </template>

      <template #loading>
        <h4>Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column expander style="width: 5rem"/>
      <!--      INVOICE NUMBER  -->
      <Column field="invoiceNumber" header="Nr faktury" :sortable="true">
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..."/>
        </template>
      </Column>

      <!--      CUSTOMER  -->
      <Column
          header="Nazwa klienta"
          :sortable="true"
          sortField="customer.name"
          style="min-width: 12rem"
          filter-field="customer"
          :show-filter-match-modes="false"
      >
        <template #body="{data}">
          {{ getCustomerLabel(data.customer) }}
        </template>
        <template #filter="{ filterModel }">
          <MultiSelect
              v-model="filterModel.value"
              :options="customerStore.getSortedCustomers"
              :option-label="getCustomerLabel"
              placeholder="Wybierz..."
              class="p-column-filter"
              :max-selected-labels="0"
              style="min-width: 12rem; width: 12rem"
          />
        </template>
      </Column>
      <!--      SELL DATE-->
      <Column field="sellDate" header="Data sprzedaży" :sortable="true" data-type="date">
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.sellDate) }}
        </template>
        <template #filter="{ filterModel }">
          <DatePicker v-model="filterModel.value" dateFormat="yy-mm-dd" placeholder="yyyy-dd-mm"/>
        </template>
      </Column>

      <!--      INVOICE DATE-->
      <Column field="invoiceDate" header="Data wystawienia" :sortable="true" data-type="date">
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.invoiceDate) }}
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..."/>
        </template>
      </Column>

      <!--      PAYMENT METHOD-->
      <Column field="paymentMethod" header="Rodzaj płatności" :sortable="true">
        <template #body="{ data }">
          {{ TranslationService.translateEnum("PaymentMethod", data.paymentMethod) }}
        </template>
      </Column>

      <!--      PAYMENT DATE -->
      <Column field="paymentDate" header="Termin płatności" :sortable="true" data-type="date">
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.paymentDate) }}
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..."/>
        </template>
      </Column>

      <!--      AMOUNT-->
      <Column field="amount" header="Wartość" style="min-width: 120px" dataType="numeric">
        <template #body="{data}">
          {{ UtilsService.formatCurrency(FinanceService.getInvoiceAmount(data)) }}
        </template>
        <template #filter="{ filterModel }">
          <InputNumber v-model="filterModel.value" mode="currency" currency="PLN" locale="pl-PL"/>
        </template>
      </Column>
      <Column field="paymentStatus" header="Status" style="width: 100px">
        <template #body="{ data, field }">
          <StatusButton
              title="Zmień status faktury (Zapłacona/Do zapłaty)"
              :btn-type="data[field]"
              :color-icon="data[field] === 'PAID' ? '#2da687' : '#dc3545'"
              @click="confirmStatusChange(data)"
          />
        </template>
      </Column>
      <!--             PDF,   EDIT, DELETE-->
      <Column header="Akcja" :exportable="false" style="min-width: 8rem">
        <template #body="slotProps">
          <div class="flex flex-row gap-1 justify-content-end">
            <OfficeIconButton
                title="Pobierz PDF"
                icon="pi pi-file-pdf"
                :btn-disabled="invoiceStore.loadingFile"
                @click="
                downloadPdf(
                  slotProps.data.idInvoice,
                  slotProps.data.invoiceNumber
                )
              "
            />
            <OfficeIconButton
                title="Edytuj fakturę"
                icon="pi pi-file-edit"
                @click="editItem(slotProps.data)"
            />
            <OfficeIconButton
                title="Usuń fakturę"
                icon="pi pi-trash"
                severity="danger"
                @click="confirmDeleteInvoice(slotProps.data)"
            />
          </div>
        </template>
      </Column>
      <template #expansion="slotProps">
        <div class="p-3 flex flex-col ">
          <p class="text-center">Szczególy faktury nr {{ slotProps.data.invoiceNumber }}</p>
          <DataTable :value="slotProps.data.invoiceItems">
            <!-- NAME  -->
            <Column field="name">
              <template #header>
                <div class="w-full" style="text-align: left">Nazwa</div>
              </template>
              <template #body="{ data, field }">
                <p style="text-align: left">{{ data[field] }}</p>
              </template>
            </Column>

            <!-- JM  -->
            <Column field="unit">
              <template #header>
                <div class="w-full" style="text-align: center">Jm</div>
              </template>
              <template #body="{ data, field }">
                <p class="text-center">{{ data[field] }}</p>
              </template>
            </Column>

            <!-- QUANTITY  -->
            <Column field="quantity">
              <template #header>
                <div class="w-full" style="text-align: center">Ilość</div>
              </template>
              <template #body="{ data, field }">
                <p class="text-center">{{ data[field] }}</p>
              </template>
            </Column>

            <!-- AMOUNT  -->
            <Column field="amount">
              <template #header>
                <div class="w-full" style="text-align: center">Kwota</div>
              </template>
              <template #body="slotProps">
                <p class="text-center">{{ UtilsService.formatCurrency(slotProps.data.amount) }}</p>
              </template>
            </Column>

            <!--  SUM  -->
            <Column>
              <template #header>
                <div class="w-full" style="text-align: center">Wartość</div>
              </template>
              <template #body="slotProps">
                <p class="text-center">  {{ UtilsService.formatCurrency(FinanceService.getInvoiceItemAmount(slotProps.data)) }}</p>
              </template>
            </Column>
          </DataTable>
          <p class="mt-2" style="text-align: center">
            <b>Info:</b> {{ slotProps.data.otherInfo }}
          </p>
        </div>
      </template>
    </DataTable>
  </Panel>
</template>

<style scoped>
.p-datatable .p-datatable-tbody > tr > td {
  text-align: center !important;
}
</style>
