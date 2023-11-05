<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { FilterMatchMode } from "primevue/api";
import OfficeButton from "@/components/OfficeButton.vue";
import TheMenu from "@/components/TheMenu.vue";
import EditButton from "@/components/EditButton.vue";
import DeleteButton from "@/components/DeleteButton.vue";
import router from "@/router";
import StatusButton from "@/components/StatusButton.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import { useToast } from "primevue/usetoast";
import { Customer } from "@/assets/types/Customer";
import { useInvoiceStore } from "@/stores/invoices";
const toast = useToast();
import { useCustomerStore } from "@/stores/customers";
import { CustomerStatus } from "@/assets/types/CustomerStatus";
import InformationDialog from "@/components/InformationDialog.vue";
import LoadingDialog from "@/components/LoadingDialog.vue";
const invoiceStore = useInvoiceStore();
const customerStore = useCustomerStore();
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  // name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  // 'country.name': { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  // representative: { value: null, matchMode: FilterMatchMode.IN },
  // status: { value: null, matchMode: FilterMatchMode.EQUALS },
  // verified: { value: null, matchMode: FilterMatchMode.EQUALS }
});
const expandedRows = ref([]);
const customerTemp = ref<Customer>();

//
//---------------------------------------------STATUS CHANGE--------------------------------------------------
//
const showStatusChangeConfirmationDialog = ref<boolean>(false);
const confirmStatusChange = (customer: Customer) => {
  customerTemp.value = customer;
  showStatusChangeConfirmationDialog.value = true;
};
const changeStatusConfirmationMessage = computed(() => {
  if (customerTemp.value)
    return `Czy chcesz zmienić status klienta  <b>${
      getCustomerFullName.value
    }</b>  na <b>${
      customerTemp.value?.customerStatus === "ACTIVE" ? "Nieaktywny" : "Aktywny"
    }</b>?`;
  return "No message";
});
const submitChangeStatus = async () => {
  if (customerTemp.value) {
    let newStatus: CustomerStatus = {
      name:
        customerTemp.value?.customerStatus.name === "ACTIVE"
          ? "INACTIVE"
          : "ACTIVE",
      viewName:
        customerTemp.value?.customerStatus.viewName !== "ACTIVE"
          ? "Aktywny"
          : "Nieaktywny",
    };
    const result = await customerStore.updateCustomerStatusDb(
      customerTemp.value?.id,
      newStatus
    );
    if (result)
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail:
          "Zaaktualizowano status klienta: " +
          customerTemp.value?.firstName +
          " " +
          customerTemp.value?.name,
        life: 3000,
      });
  }
  showStatusChangeConfirmationDialog.value = false;
};

//
//-------------------------------------------------DELETE CUSTOMER-------------------------------------------------
//
const showDeleteConfirmationDialog = ref<boolean>(false);
const showDeleteInformationDialog = ref<boolean>(false);
const hasInvoices = ref<boolean>(false);

const confirmDeleteInvoice = async (customer: Customer) => {
  customerTemp.value = customer;
  hasInvoices.value = await invoiceStore
    .getCustomerInvoices(customerTemp.value?.id)
    .then((value) => {
      return value.length > 0;
    });
  if (!hasInvoices.value) showDeleteConfirmationDialog.value = true;
  else showDeleteInformationDialog.value = true;
};

const deleteConfirmationMessage = computed(() => {
  if (customerTemp.value && !hasInvoices.value) {
    return `Czy chcesz usunąc klienta: <b>${getCustomerFullName.value}</b>?`;
  }
  if (customerTemp.value && hasInvoices.value) {
    return `Nie możesz usunąć klienta: <b>${getCustomerFullName.value}</b>, ponieważ są do niego przypisane faktury. <br><br>Najpierw usuń faktury`;
  }
  return "No message";
});
const submitDelete = async () => {
  console.log("submitDelete()");
  if (customerTemp.value) {
    const result = await customerStore.deleteCustomerDb(customerTemp.value.id);
    if (result)
      toast.add({
        severity: "success",
        summary: "Potwierdzenie",
        detail: "Usunięto klienta: " + getCustomerFullName.value,
        life: 3000,
      });
  }
  showDeleteConfirmationDialog.value = false;
};

//
//-------------------------------------------------EDIT CUSTOMER-------------------------------------------------
//
const editCustomer = (customer: Customer) => {
  // console.log("EDIT CUSTOMER:", customer);
  const customerTemp: Customer = JSON.parse(JSON.stringify(customer));
  router.push({
    name: "Customer",
    params: { isEdit: "true", customerId: customerTemp.id },
  });
};

onMounted(() => {
  customerStore.getCustomersFromDb("ALL", true);
});

const getCustomerFullName = computed(() => {
  return customerTemp.value?.firstName + " " + customerTemp.value?.name;
});
</script>
<template>
  <Toast />
  <TheMenu />
  <LoadingDialog :visible="invoiceStore.loadingWait" />
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

  <InformationDialog
    v-model:visible="showDeleteInformationDialog"
    :msg="deleteConfirmationMessage"
    @cancel="showDeleteInformationDialog = false"
  />

  <Panel class="my-5 mx-2">
    <template #header>
      <div class="w-full flex justify-content-center">
        <h3 class="color-green">LISTA KLIENTÓW</h3>
        <div v-if="customerStore.loadingCustomer">
          <ProgressSpinner
            class="ml-3"
            style="width: 40px; height: 40px"
            stroke-width="5"
          />
        </div>
      </div>
    </template>
    <DataTable
      v-model:filters="filters"
      v-model:expandedRows="expandedRows"
      :value="customerStore.customers"
      :loading="customerStore.loadingCustomer"
      striped-rows
      removable-sort
      paginator
      :rows="10"
      :rows-per-page-options="[5, 10, 20, 50]"
      table-style="min-width: 50rem"
      filter-display="row"
      :global-filter-fields="['customerName', 'invoiceNumber', 'sellDate']"
    >
      <template #header>
        <div class="flex justify-content-sm-between">
          <router-link
            :to="{
              name: 'Customer',
              params: { isEdit: 'false', customerId: 0 },
            }"
            style="text-decoration: none"
          >
            <OfficeButton text="Nowy klient" btn-type="ahead" />
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
        <h4 v-if="!customerStore.loadingCustomer" class="color-red">
          Nie znaleziono klientów...
        </h4>
      </template>

      <template #loading>
        <h4 class="color-green">Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column expander style="width: 5rem" />
      <Column field="firstName" header="Imię"></Column>
      <Column
        field="name"
        header="Nazwisko/Nazwa"
        sortable
        style="text-align: left"
      ></Column>
      <Column field="address.street" header="Ulica" sortable></Column>
      <Column field="address.city" header="Miasto" sortable></Column>
      <Column field="nip" header="NIP" sortable></Column>

      <!--  STATUS BUTTON    -->
      <Column field="customerStatus" header="Status" style="width: 100px">
        <template #body="{ data, field }">
          <StatusButton
            v-tooltip.top="{
              value: 'Zmień status klienta (Aktywny/Nieaktywny)',
              showDelay: 1000,
              hideDelay: 300,
            }"
            :btn-type="data[field].name"
            :color-icon="data[field].name === 'ACTIVE' ? '#2da687' : '#dc3545'"
            @click="confirmStatusChange(data)"
          />
        </template>
      </Column>
      <!--                EDIT, DELETE-->
      <Column header="Akcja" :exportable="false" style="min-width: 8rem">
        <template #body="slotProps">
          <div class="flex flex-row gap-1 justify-content-end">
            <EditButton
              v-tooltip.top="{
                value: 'Edytuj klienta',
                showDelay: 1000,
                hideDelay: 300,
              }"
              @click="editCustomer(slotProps.data)"
            />
            <DeleteButton
              v-tooltip.top="{
                value: 'Usuń klienta',
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
          <h5>Szczególy klienta:</h5>

          <p class="mt-2 ml-8" style="text-align: left">
            <b>Adres:</b> ul. {{ slotProps.data.address.street }},
            {{ slotProps.data.address.zip }} {{ slotProps.data.address.city }}
          </p>
          <p class="mt-2 ml-8" style="text-align: left">
            <b>E-mail:</b> {{ slotProps.data.mail }}
          </p>
          <p class="mt-2 ml-8" style="text-align: left">
            <b>Regon:</b> {{ slotProps.data.regon }}
          </p>
          <p class="mt-2 ml-8" style="text-align: left">
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
