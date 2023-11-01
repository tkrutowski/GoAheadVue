<script setup lang="ts">
import { useInvoiceStore } from "@/stores/invoices";
import { computed, onMounted, ref } from "vue";
import { FilterMatchMode } from "primevue/api";
import { Invoice } from "@/assets/types/Invoice";
import { PaymentStatus } from "@/assets/types/PaymentStatus";
import OfficeButton from "@/components/OfficeButton.vue";
import TheMenu from "@/components/TheMenu.vue";
import EditButton from "@/components/EditButton.vue";
import DeleteButton from "@/components/DeleteButton.vue";
import router from "@/router";
import StatusButton from "@/components/StatusButton.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import { useToast } from "primevue/usetoast";
import FileButton from "@/components/FileButton.vue";
const toast = useToast();
const invoiceStore = useInvoiceStore();
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  // name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  // 'country.name': { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  // representative: { value: null, matchMode: FilterMatchMode.IN },
  // status: { value: null, matchMode: FilterMatchMode.EQUALS },
  // verified: { value: null, matchMode: FilterMatchMode.EQUALS }
});
const expandedRows = ref([]);
const invoiceTemp = ref<Invoice>();
const formatCurrency = (value: number) => {
  return value.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
};
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
      invoiceTemp.value.paymentStatus === "PAID" ? "Do zapłaty" : "Zapłacony"
    }</b>?`;
  return "No message";
});
const submitChangeStatus = async () => {
  console.log("submitChangeStatus: ", invoiceTemp.value);
  if (invoiceTemp.value) {
    let newStatus: PaymentStatus = {
      name: invoiceTemp.value.paymentStatus.name === "PAID" ? "TO_PAY" : "PAID",
      viewName:
        invoiceTemp.value?.paymentStatus.viewName !== "PAID"
          ? "Zapłacony"
          : "Do zapłaty",
    };
    console.log("newStatus", newStatus);
    const result = await invoiceStore.updateInvoiceStatusDb(
      invoiceTemp.value.idInvoice,
      newStatus
    );
    if (result)
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail:
          "Zaaktualizowano status faktury nr: " +
          invoiceTemp.value?.invoiceNumber,
        life: 3000,
      });
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
  console.log("submitDelete: ", invoiceTemp.value);
  if (invoiceTemp.value) {
    const result = await invoiceStore.deleteInvoiceDb(
      invoiceTemp.value.idInvoice
    );
    if (result)
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail: "Usunięto fakturę nr: " + invoiceTemp.value?.invoiceNumber,
        life: 3000,
      });
  }
  showDeleteConfirmationDialog.value = false;
};

const editItem = (item: Invoice) => {
  console.log("EDIT INVOICE:", item);
  const invoiceItem: Invoice = JSON.parse(JSON.stringify(item));
  router.push({
    name: "Invoice",
    params: { isEdit: "true", invoiceId: invoiceItem.idInvoice },
  });
};

onMounted(() => {
  invoiceStore.getInvoicesFromDb("ALL");
});
</script>
<template>
  <Toast />
  <TheMenu />
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
      <div class="w-full flex justify-content-center">
        <h3 class="color-green">LISTA FAKTUR</h3>
        <div v-if="invoiceStore.loadingInvoices">
          <ProgressSpinner
            class="ml-3"
            style="width: 40px; height: 40px"
            strokeWidth="5"
          />
        </div>
      </div>
    </template>
    <DataTable
      v-model:expandedRows="expandedRows"
      v-model:filters="filters"
      :value="invoiceStore.invoices"
      :loading="invoiceStore.loadingInvoices"
      striped-rows
      removable-sort
      paginator
      sort-field="invoiceNumber"
      :sort-order="-1"
      :rows="10"
      :rows-per-page-options="[5, 10, 20, 50]"
      table-style="min-width: 50rem"
      filter-display="row"
      :global-filter-fields="['customerName', 'invoiceNumber', 'sellDate']"
    >
      <template #header>
        <div class="flex justify-content-sm-between">
          <router-link
            :to="{ name: 'Invoice', params: { isEdit: 'false', invoiceId: 0 } }"
            style="text-decoration: none"
          >
            <OfficeButton text="Nowa faktura" btn-type="ahead" />
          </router-link>
          <span class="p-input-icon-left">
            <i class="pi pi-search" />
            <InputText
              v-model="filters['global'].value"
              placeholder="Keyword Search"
            />
          </span>
        </div>
      </template>

      <template #empty>
        <h4 class="color-red">Nie znaleziono faktur...</h4>
      </template>

      <template #loading>
        <h4 class="color-green">Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column expander style="width: 5rem" />
      <Column field="invoiceNumber" header="Nr faktury" sortable></Column>
      <Column field="customerName" header="Nazwa klienta" sortable></Column>
      <Column field="sellDate" header="Data sprzedaży" sortable></Column>
      <Column field="invoiceDate" header="Data wystawienia" sortable></Column>
      <Column field="paymentMethod" header="Rodzaj płatności" sortable>
        <template #body="{ data, field }">
          {{ formatCurrency(data[field].viewName) }}
        </template>
      </Column>
      <Column field="paymentDate" header="Termin płatności" sortable></Column>
      <Column field="amount" header="Wartość" style="min-width: 120px">
        <template #body="slotProps">
          {{ formatCurrency(slotProps.data[slotProps.field]) }}
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
            :btn-type="data[field].name"
            :color-icon="data[field].name === 'PAID' ? '#2da687' : '#dc3545'"
            @click="confirmStatusChange(data)"
          />
        </template>
      </Column>
      <!--                EDIT, DELETE-->
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
                invoiceStore.getInvoicePdfFromDb(
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
          <h5>Szczególy faktury nr {{ slotProps.data.invoiceNumber }}</h5>
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

.card {
  //background: var(--surface-card);
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 1rem;
}
</style>
