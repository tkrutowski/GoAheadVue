<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import {FilterMatchMode, FilterOperator} from '@primevue/core/api';
import {Invoice} from "@/types/Invoice";
import {PaymentStatus} from "@/types/PaymentStatus";
import OfficeButton from "@/components/OfficeButton.vue";
import TheMenu from "@/components/TheMenu.vue";
import EditButton from "@/components/EditButton.vue";
import DeleteButton from "@/components/DeleteButton.vue";
import router from "@/router";
import StatusButton from "@/components/StatusButton.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import {useToast} from "primevue/usetoast";
import FileButton from "@/components/FileButton.vue";
import {useCustomerStore} from "@/stores/customers";

const customerStore = useCustomerStore();
import {useInvoiceStore} from "@/stores/invoices";

const invoiceStore = useInvoiceStore();
const toast = useToast();

//filter
const filters = ref();
const initFilters = () => {
  filters.value = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
    customer: {value: null, matchMode: FilterMatchMode.CONTAINS},
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
const formatCurrency = (value: number) => {
  return value.toLocaleString("pl-PL", {style: "currency", currency: "PLN"});
};
const formatDate = (value) => {
  return value.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split('.').reverse().join('-');
};
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
        invoiceTemp.value.paymentStatus.name === "PAID"
            ? "Do zapłaty"
            : "Zapłacony"
    }</b>?`;
  return "No message";
});
const submitChangeStatus = async () => {
  console.log("submitChangeStatus()");
  if (invoiceTemp.value) {
    let newStatus: PaymentStatus = {
      name: invoiceTemp.value.paymentStatus.name === "PAID" ? "TO_PAY" : "PAID",
      viewName:
          invoiceTemp.value?.paymentStatus.viewName !== "PAID"
              ? "Zapłacony"
              : "Do zapłaty",
    };
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
        .catch(() => {
          toast.add({
            severity: "error",
            summary: "Błąd",
            detail: "Błąd podczas aktualizacji statusu faktury nr: " +
                invoiceTemp.value?.invoiceNumber,
            life: 3000,
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
const downloadPdf = (idInvoice: number, invoiceNumber:string) => {
  console.log("START - downloadPdf for ",invoiceNumber)
   invoiceStore.getInvoicePdfFromDb(idInvoice)
      .then(response => {
  console.log("then - downloadPdf for ",invoiceNumber)
        const fileURL = window.URL.createObjectURL(new Blob([response.data]));
        const fileLink = document.createElement("a");
        fileLink.href = fileURL;
        fileLink.setAttribute("download", "faktura_" + invoiceNumber + ".pdf");
        document.body.appendChild(fileLink);
        // this.btnDisabled = false;
        fileLink.click();
      })
      .catch(() => {
  console.log("catch - downloadPdf for ",invoiceNumber)
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

  onMounted(async () => {
    await customerStore.getCustomersFromDb("ALL", false);
    await invoiceStore.getInvoicesFromDb("ALL");
  });
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
        <h3 class="color-green">LISTA FAKTUR</h3>
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
        v-if="!invoiceStore.loadingInvoices"
        v-model:expanded-rows="expandedRows"
        v-model:filters="filters"
        :value="invoiceStore.getInvoiceDtos"
        :loading="invoiceStore.loadingInvoices"
        striped-rows
        removable-sort
        paginator
        sort-field="invoiceNumber"
        :sort-order="-1"
        :rows="10"
        :rows-per-page-options="[5, 10, 20, 50]"
        table-style="min-width: 50rem"
        filter-display="menu"
        :global-filter-fields="['customer', 'invoiceNumber', 'sellDate']"
    >
      <template #header>
        <div class="flex justify-between">
          <router-link
              :to="{ name: 'Invoice', params: { isEdit: 'false', invoiceId: 0 } }"
              style="text-decoration: none"
          >
            <OfficeButton text="Nowa faktura" btn-type="ahead"/>
          </router-link>
          <Button type="button" icon="pi pi-filter-slash" label="Wyczyść" outlined @click="clearFilter()"/>
          <IconField icon-position="left">
            <InputIcon>
              <i class="pi pi-search"/>
            </InputIcon>
            <InputText
                v-model="filters['global'].value"
                placeholder="wpisz tutaj..."
            />
          </IconField>
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
          field="customer"
          header="Nazwa klienta"
          :sortable="true"
          style="min-width: 12rem"
          filter-field="customer"
          :show-filter-match-modes="false"
      >
        <template #body="slotProps">
          {{ slotProps.data[slotProps.field] }}
        </template>
        <template #filter="{ filterModel }">
          <Select
              v-model="filterModel.value"
              :options="customerStore.getCustomerNames"
              placeholder="Wybierz..."
              class="p-column-filter"
              style="min-width: 12rem; width: 12rem"
              :show-clear="true"
          />
        </template>
      </Column>
      <!--      SELL DATE-->
      <Column field="sellDate" header="Data sprzedaży" :sortable="true" data-type="date">
        <template #body="{ data }">
          {{ formatDate(data.sellDate) }}
        </template>
        <template #filter="{ filterModel }">
          <DatePicker v-model="filterModel.value" dateFormat="yy-mm-dd" placeholder="yyyy-dd-mm" />
        </template>
      </Column>
      <!--      INVOICE DATE-->
      <Column field="invoiceDate" header="Data wystawienia" :sortable="true" data-type="date" >
        <template #body="{ data }">
          {{ formatDate(data.invoiceDate) }}
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..."/>
        </template>
      </Column>
      <!--      PAYMENT METHOD-->
      <Column field="paymentMethod" header="Rodzaj płatności" :sortable="true"/>
      <!--      PAYMENT DATE -->
      <Column field="paymentDate" header="Termin płatności" :sortable="true" data-type="date">
        <template #body="{ data }">
          {{ formatDate(data.paymentDate) }}
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..."/>
        </template>
      </Column>
      <!--      AMOUNT-->
      <Column field="amount" header="Wartość" style="min-width: 120px" dataType="numeric">
        <template #body="slotProps">
          {{ formatCurrency(slotProps.data[slotProps.field]) }}
        </template>
        <template #filter="{ filterModel }">
          <InputNumber v-model="filterModel.value" mode="currency" currency="PLN" locale="pl-PL"/>
        </template>
      </Column>
      <Column field="paymentStatus" header="Status" style="width: 100px">
        <template #body="{ data, field }">
          <StatusButton
              v-tooltip.top="{
              value: 'Zmień status faktury (Zapłacona/Do zapłaty)',
              showDelay: 1000,
              hideDelay: 300,
            }"
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
            <FileButton
                v-tooltip.top="{
                value: 'Pobierz PDF',
                showDelay: 1000,
                hideDelay: 300,
              }"
                icon="pi-file-pdf"
                :btn-disabled="invoiceStore.loadingFile"
                @click="
                downloadPdf(
                  slotProps.data.idInvoice,
                  slotProps.data.invoiceNumber
                )
              "
            />
            <EditButton
                v-tooltip.top="{
                value: 'Edytuj fakturę',
                showDelay: 1000,
                hideDelay: 300,
              }"
                @click="editItem(slotProps.data)"
            />
            <DeleteButton
                v-tooltip.top="{
                value: 'Usuń fakturę',
                showDelay: 1000,
                hideDelay: 300,
              }"
                @click="confirmDeleteInvoice(slotProps.data)"
            />
          </div>
        </template>
      </Column>
      <template #expansion="slotProps">
        <div class="p-3">
          <h4>Szczególy faktury nr {{ slotProps.data.invoiceNumber }}</h4>
          <DataTable :value="slotProps.data.invoiceItems">
            <Column field="name">
              <template #header>
                <div class="w-full" style="text-align: left">Nazwa</div>
              </template>
              <template #body="{ data, field }">
                <div style="text-align: left">{{ data[field] }}</div>
              </template>
            </Column>
            <Column field="jm" header="Jm">
              <template #body="{ data, field }">
                <div style="text-align: center">{{ data[field] }}</div>
              </template>
            </Column>
            <Column field="quantity" header="Ilość"></Column>
            <Column field="amount" header="Kwota">
              <template #body="slotProps">
                {{ formatCurrency(slotProps.data.amount) }}
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
