<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import {FilterMatchMode} from '@primevue/core/api';
import OfficeButton from "@/components/OfficeButton.vue";
import TheMenu from "@/components/TheMenu.vue";
import router from "@/router";
import StatusButton from "@/components/StatusButton.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import {type Customer, CustomerStatus} from "@/types/Customer";
import {useInvoiceStore} from "@/stores/invoices";
import {useCustomerStore} from "@/stores/customers";
import InformationDialog from "@/components/InformationDialog.vue";
import LoadingDialog from "@/components/LoadingDialog.vue";
import {useToast} from "primevue/usetoast";
import OfficeIconButton from "@/components/OfficeIconButton.vue";
import type {AxiosError} from "axios";

const invoiceStore = useInvoiceStore();
const customerStore = useCustomerStore();
const toast = useToast();
const expandedRows = ref([]);
const customerTemp = ref<Customer>();

//filter
const filters = ref();
const initFilters = () => {
  filters.value = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
    name: {value: null, matchMode: FilterMatchMode.CONTAINS},
    'address.street': {value: null, matchMode: FilterMatchMode.CONTAINS},
    'address.city': {value: null, matchMode: FilterMatchMode.CONTAINS},
    // 'customerStatus.name': { value: null, matchMode: FilterMatchMode.IN },
    // customerStatus: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    // 'country.name': { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    // representative: { value: null, matchMode: FilterMatchMode.IN },
    // verified: { value: null, matchMode: FilterMatchMode.EQUALS },
  };
}
initFilters();
const clearFilter = () => {
  initFilters();
};
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
        customerTemp.value?.customerStatus === CustomerStatus.ACTIVE
            ? "Nieaktywny"
            : "Aktywny"
    }</b>?`;
  return "No message";
});
const submitChangeStatus = async () => {
      if (customerTemp.value) {
        let newStatus: CustomerStatus = customerTemp.value?.customerStatus === CustomerStatus.ACTIVE
                  ? CustomerStatus.INACTIVE
                  : CustomerStatus.ACTIVE

        await customerStore.updateCustomerStatusDb(
            customerTemp.value?.id,
            newStatus
        ).then(() => {
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
        }).catch((reason: AxiosError) => {
          toast.add({
            severity: "error",
            summary: reason.message,
            detail: "Nie udało się zaaktualizować statusu klienta",
            life: 5000,
          });
        });
        showStatusChangeConfirmationDialog.value = false;
      }
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
      await customerStore.deleteCustomerDb(customerTemp.value.id)
          .then(() => {
            toast.add({
              severity: "success",
              summary: "Potwierdzenie",
              detail: "Usunięto klienta: " + getCustomerFullName.value,
              life: 3000,
            });
          }).catch(() => {
            toast.add({
              severity: "error",
              summary: "Błąd",
              detail: "Nie udało się usunąć klienta",
              life: 3000,
            });
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
      params: {isEdit: "true", customerId: customerTemp.id},
    });
  };

  onMounted(() => {
    if (customerStore.customers.length <= 1)customerStore.getCustomersFromDb("ALL");
  });

  const getCustomerFullName = computed(() => {
    return customerTemp.value?.firstName + " " + customerTemp.value?.name;
  })
</script>
<template>
  <TheMenu/>
  <LoadingDialog :visible="invoiceStore.loadingWait"/>
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
      <div class="w-full flex justify-center gap-4">
        <div v-if="customerStore.loadingCustomer">
          <ProgressSpinner
              class="ml-3"
              style="width: 35px; height: 35px"
              stroke-width="5"
          />
        </div>
      </div>
    </template>
    <DataTable
        v-if="!customerStore.loadingCustomer"
        v-model:filters="filters"
        v-model:expanded-rows="expandedRows"
        :value="customerStore.customers"
        :loading="customerStore.loadingCustomer"
        striped-rows
        removable-sort
        paginator
        :rows="10"
        :rows-per-page-options="[5, 10, 20, 50]"
        table-style="min-width: 50rem"
        filter-display="menu"
        :global-filter-fields="[
        'firstName',
        'name',
        'nip',
        'address.street',
        'address.city',
      ]"
    >
      <template #header>
        <div class="flex justify-between">
          <router-link
              :to="{
              name: 'Customer',
              params: { isEdit: 'false', customerId: 0 },
            }"
              style="text-decoration: none"
          >
            <OfficeButton text="Nowy klient" btn-type="office-regular"/>
          </router-link>
          <div class="flex gap-4">
            <IconField icon-position="left">
              <InputIcon>
                <i class="pi pi-search"/>
              </InputIcon>
              <InputText class="!max-w-32"
                         v-model="filters['global'].value"
                         placeholder="wyszukaj..."
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
        <h4 v-if="!customerStore.loadingCustomer" class="text-red-500">
          Nie znaleziono klientów...
        </h4>
      </template>

      <template #loading>
        <h4 class="color-green">Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column expander style="width: 5rem"/>
      <Column field="firstName" header="Imię"></Column>
      <Column
          field="name"
          header="Nazwisko/Nazwa"
          :sortable="true"
          style="text-align: left"
      >
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..."/>
        </template>
      </Column>
      <Column field="address.street" header="Ulica" sortable>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..."/>
        </template>
      </Column>
      <Column field="address.city" header="Miasto" sortable>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..."/>
        </template>
      </Column>
      <Column field="nip" header="NIP" sortable></Column>

      <!--  STATUS BUTTON    -->
      <Column field="customerStatus" header="Status" style="width: 100px">
        <template #body="{ data, field }">
          <StatusButton
              title="Zmień status klienta (Aktywny/Nieaktywny)"
              :btn-type="data[field]"
              :color-icon="data[field] === 'ACTIVE' ? '#2da687' : '#dc3545'"
              @click="confirmStatusChange(data)"
          />
        </template>
      </Column>
      <!--                EDIT, DELETE-->
      <Column header="Akcja" :exportable="false" style="min-width: 8rem">
        <template #body="slotProps">
          <div class="flex flex-row gap-1 justify-content-end">
            <OfficeIconButton
                title="Edytuj klienta"
                icon="pi pi-file-edit"
                @click="editCustomer(slotProps.data)"
            />
            <OfficeIconButton
                title="Usuń klienta"
                icon="pi pi-trash"
                severity="danger"
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
