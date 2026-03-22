<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { FilterMatchMode } from "@primevue/core/api";
import OfficeButton from "@/components/OfficeButton.vue";
import TheMenu from "@/components/TheMenu.vue";
import router from "@/router";
import StatusButton from "@/components/StatusButton.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import { CustomerStatus } from "@/types/Customer";
import type { Supplier } from "@/types/Supplier";
import { useCostStore } from "@/stores/costs";
import { useSupplierStore } from "@/stores/suppliers";
import InformationDialog from "@/components/InformationDialog.vue";
import { useToast } from "primevue/usetoast";
import OfficeIconButton from "@/components/OfficeIconButton.vue";
import type { AxiosError } from "axios";

const costStore = useCostStore();
const supplierStore = useSupplierStore();
const toast = useToast();
const expandedRows = ref([]);
const supplierTemp = ref<Supplier>();

const filters = ref();
const initFilters = () => {
  filters.value = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    firstName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    "address.street": { value: null, matchMode: FilterMatchMode.CONTAINS },
    "address.city": { value: null, matchMode: FilterMatchMode.CONTAINS },
  };
};
initFilters();
const clearFilter = () => {
  initFilters();
};

const showStatusChangeConfirmationDialog = ref<boolean>(false);
const confirmStatusChange = (supplier: Supplier) => {
  supplierTemp.value = supplier;
  showStatusChangeConfirmationDialog.value = true;
};
const changeStatusConfirmationMessage = computed(() => {
  if (supplierTemp.value)
    return `Czy chcesz zmienić status dostawcy <b>${
      supplierTemp.value.firstName
    }</b> na <b>${
      supplierTemp.value?.customerStatus === CustomerStatus.ACTIVE
        ? "Nieaktywny"
        : "Aktywny"
    }</b>?`;
  return "No message";
});
const submitChangeStatus = async () => {
  if (supplierTemp.value) {
    const newStatus: CustomerStatus =
      supplierTemp.value?.customerStatus === CustomerStatus.ACTIVE
        ? CustomerStatus.INACTIVE
        : CustomerStatus.ACTIVE;

    await supplierStore
      .updateSupplierStatusDb(supplierTemp.value?.id, newStatus)
      .then(() => {
        toast.add({
          severity: "success",
          summary: "Potwierdzenie",
          detail:
            "Zaaktualizowano status dostawcy: " +
            supplierTemp.value?.firstName,
          life: 3000,
        });
      })
      .catch((reason: AxiosError) => {
        toast.add({
          severity: "error",
          summary: reason.message,
          detail: "Nie udało się zaaktualizować statusu dostawcy",
          life: 5000,
        });
      });
    showStatusChangeConfirmationDialog.value = false;
  }
};

const showDeleteConfirmationDialog = ref<boolean>(false);
const showDeleteInformationDialog = ref<boolean>(false);
const hasCosts = ref<boolean>(false);

const confirmDeleteSupplier = async (supplier: Supplier) => {
  supplierTemp.value = supplier;
  hasCosts.value = await costStore.supplierHasCosts(supplier.id);
  if (!hasCosts.value) showDeleteConfirmationDialog.value = true;
  else showDeleteInformationDialog.value = true;
};

const deleteConfirmationMessage = computed(() => {
  if (supplierTemp.value && !hasCosts.value) {
    return `Czy chcesz usunąć dostawcę: <b>${supplierTemp.value.firstName}</b>?`;
  }
  if (supplierTemp.value && hasCosts.value) {
    return `Nie możesz usunąć dostawcy: <b>${supplierTemp.value.firstName}</b>, ponieważ są do niego przypisane koszty. <br><br>Najpierw usuń lub zmień koszty`;
  }
  return "No message";
});

const submitDelete = async () => {
  if (supplierTemp.value) {
    await supplierStore
      .deleteSupplierDb(supplierTemp.value.id)
      .then(() => {
        toast.add({
          severity: "success",
          summary: "Potwierdzenie",
          detail: "Usunięto dostawcę: " + supplierTemp.value?.firstName,
          life: 3000,
        });
      })
      .catch(() => {
        toast.add({
          severity: "error",
          summary: "Błąd",
          detail: "Nie udało się usunąć dostawcy",
          life: 3000,
        });
      });
  }
  showDeleteConfirmationDialog.value = false;
};

const editSupplier = (supplier: Supplier) => {
  const s: Supplier = JSON.parse(JSON.stringify(supplier));
  router.push({
    name: "Supplier",
    params: { isEdit: "true", supplierId: s.id },
  });
};

onMounted(() => {
  if (supplierStore.suppliers.length <= 1)
    supplierStore.getSuppliersFromDb("ALL");
});
</script>

<template>
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

  <InformationDialog
    v-model:visible="showDeleteInformationDialog"
    :msg="deleteConfirmationMessage"
    @cancel="showDeleteInformationDialog = false"
  />

  <Panel class="my-5 mx-2">
    <template #header>
      <div class="w-full flex justify-center gap-4">
        <div v-if="supplierStore.loadingSupplier">
          <ProgressSpinner
            class="ml-3"
            style="width: 35px; height: 35px"
            stroke-width="5"
          />
        </div>
      </div>
    </template>
    <DataTable
      v-if="!supplierStore.loadingSupplier"
      v-model:filters="filters"
      v-model:expanded-rows="expandedRows"
      :value="supplierStore.suppliers"
      :loading="supplierStore.loadingSupplier"
      striped-rows
      removable-sort
      paginator
      :rows="10"
      :rows-per-page-options="[5, 10, 20, 50]"
      table-style="min-width: 50rem"
      filter-display="menu"
      :global-filter-fields="[
        'firstName',
        'nip',
        'accountNumber',
        'address.street',
        'address.city',
      ]"
    >
      <template #header>
        <div class="flex justify-between">
          <router-link
            :to="{
              name: 'Supplier',
              params: { isEdit: 'false', supplierId: 0 },
            }"
            class="no-underline"
          >
            <OfficeButton text="Nowy dostawca" btn-type="office-regular" />
          </router-link>
          <div class="flex gap-4">
            <IconField icon-position="left">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText
                class="!max-w-32"
                v-model="filters['global'].value"
                placeholder="wyszukaj..."
              />
            </IconField>
            <Button
              type="button"
              icon="pi pi-filter-slash"
              outlined
              size="small"
              title="Wyczyść filtry"
              @click="clearFilter()"
            />
          </div>
        </div>
      </template>

      <template #empty>
        <h4 v-if="!supplierStore.loadingSupplier" class="text-red-500">
          Nie znaleziono dostawców...
        </h4>
      </template>

      <template #loading>
        <h4 class="color-green">Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column expander style="width: 5rem" />
      <Column field="firstName" header="Nazwa dostawcy" :sortable="true">
        <template #filter="{ filterModel }">
          <InputText
            v-model="filterModel.value"
            type="text"
            placeholder="Wpisz tutaj..."
          />
        </template>
      </Column>
      <Column field="address.street" header="Ulica" sortable>
        <template #filter="{ filterModel }">
          <InputText
            v-model="filterModel.value"
            type="text"
            placeholder="Wpisz tutaj..."
          />
        </template>
      </Column>
      <Column field="address.city" header="Miasto" sortable>
        <template #filter="{ filterModel }">
          <InputText
            v-model="filterModel.value"
            type="text"
            placeholder="Wpisz tutaj..."
          />
        </template>
      </Column>
      <Column field="nip" header="NIP" sortable />
      <Column field="accountNumber" header="Nr konta" sortable />

      <Column field="customerStatus" header="Status" style="width: 100px">
        <template #body="{ data, field }">
          <StatusButton
            title="Zmień status dostawcy (Aktywny/Nieaktywny)"
            :btn-type="data[field]"
            :color-icon="data[field] === 'ACTIVE' ? '#2da687' : '#dc3545'"
            @click="confirmStatusChange(data)"
          />
        </template>
      </Column>
      <Column header="Akcja" :exportable="false" style="min-width: 8rem">
        <template #body="slotProps">
          <div class="flex flex-row gap-1 justify-content-end">
            <OfficeIconButton
              title="Edytuj dostawcę"
              icon="pi pi-file-edit"
              @click="editSupplier(slotProps.data)"
            />
            <OfficeIconButton
              title="Usuń dostawcę"
              icon="pi pi-trash"
              severity="danger"
              @click="confirmDeleteSupplier(slotProps.data)"
            />
          </div>
        </template>
      </Column>
      <template #expansion="slotProps">
        <div class="p-3">
          <h5>Szczegóły dostawcy:</h5>

          <p class="mt-2 ml-8 text-left">
            <b>Adres:</b> ul. {{ slotProps.data.address.street }},
            {{ slotProps.data.address.zip }} {{ slotProps.data.address.city }}
          </p>
          <p class="mt-2 ml-8 text-left">
            <b>E-mail:</b> {{ slotProps.data.mail }}
          </p>
          <p class="mt-2 ml-8 text-left">
            <b>Nr konta:</b> {{ slotProps.data.accountNumber }}
          </p>
          <p class="mt-2 ml-8 text-left">
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
