<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { FilterMatchMode } from "@primevue/core/api";
import TheMenu from "@/components/TheMenu.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import OfficeButton from "@/components/OfficeButton.vue";
import OfficeIconButton from "@/components/OfficeIconButton.vue";
import router from "@/router";
import { useToast } from "primevue/usetoast";
import { useSupplierStore } from "@/stores/suppliers";
import { useCostStore } from "@/stores/costs";
import type { Supplier } from "@/types/Supplier.ts";
import type { Cost } from "@/types/Cost.ts";
import { PaymentStatus } from "@/types/Invoice.ts";
import { UtilsService } from "@/service/UtilsService.ts";
import { FinanceService } from "@/service/FinanceService.ts";
import type { DataTablePageEvent } from "primevue";
import type { AxiosError } from "axios";

const supplierStore = useSupplierStore();
const costStore = useCostStore();
const toast = useToast();

const filters = ref();
const initFilters = () => {
  filters.value = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    seller: { value: null, matchMode: FilterMatchMode.IN },
    sellDate: { constraints: [{ value: null, matchMode: FilterMatchMode.DATE_AFTER }] },
    amount: { constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    number: { value: null, matchMode: FilterMatchMode.CONTAINS },
    paymentStatus: { value: null, matchMode: FilterMatchMode.EQUALS },
  };
};
initFilters();

const clearFilter = async () => {
  initFilters();
  await costStore.filterCosts(filters.value);
};

const expandedRows = ref([]);
const costTemp = ref<Cost>();

const showStatusChangeConfirmationDialog = ref<boolean>(false);
const confirmStatusChange = (cost: Cost) => {
  costTemp.value = cost;
  showStatusChangeConfirmationDialog.value = true;
};

const changeStatusConfirmationMessage = computed(() => {
  if (costTemp.value)
    return `Czy chcesz zmienić status kosztu nr <b>${
      costTemp.value.number
    }</b> na <b>${
      costTemp.value.paymentStatus === PaymentStatus.PAID
        ? "Do zapłaty"
        : "Zapłacony"
    }</b>?`;
  return "No message";
});

const submitChangeStatus = async () => {
  if (costTemp.value) {
    const newStatus: PaymentStatus =
      costTemp.value.paymentStatus === PaymentStatus.PAID
        ? PaymentStatus.TO_PAY
        : PaymentStatus.PAID;
    await costStore
      .updateCostStatusDb(costTemp.value.id, newStatus)
      .then(() => {
        toast.add({
          severity: "success",
          summary: "Potwierdzenie",
          detail: "Zaaktualizowano status kosztu nr: " + costTemp.value?.number,
          life: 3000,
        });
      })
      .catch((reason: AxiosError) => {
        toast.add({
          severity: "error",
          summary: reason.message,
          detail:
            "Błąd podczas aktualizacji statusu kosztu nr: " +
            costTemp.value?.number,
          life: 5000,
        });
      });
  }
  showStatusChangeConfirmationDialog.value = false;
};

const showDeleteConfirmationDialog = ref<boolean>(false);
const confirmDeleteCost = (cost: Cost) => {
  costTemp.value = cost;
  showDeleteConfirmationDialog.value = true;
};

const deleteConfirmationMessage = computed(() => {
  if (costTemp.value)
    return `Czy chcesz usunąć koszt nr <b>${costTemp.value.number}</b>?`;
  return "No message";
});

const submitDelete = async () => {
  if (costTemp.value) {
    await costStore
      .deleteCostDb(costTemp.value.id)
      .then(() => {
        toast.add({
          severity: "success",
          summary: "Potwierdzenie",
          detail: "Usunięto koszt nr: " + costTemp.value?.number,
          life: 3000,
        });
      })
      .catch(() => {
        toast.add({
          severity: "error",
          summary: "Błąd",
          detail: "Nie usunięto kosztu nr: " + costTemp.value?.number,
          life: 3000,
        });
      });
    showDeleteConfirmationDialog.value = false;
  }
};

const editItem = (item: Cost) => {
  const costItem: Cost = JSON.parse(JSON.stringify(item));
  router.push({
    name: "Cost",
    params: { isEdit: "true", costId: costItem.id },
  });
};

onMounted(async () => {
  if (supplierStore.suppliers.length <= 1)
    supplierStore.getSuppliersFromDb("ALL");
  if (costStore.costs.length === 0 && !costStore.loadingCosts) {
    await costStore.filterCosts(filters.value);
  }
});

const handlePageChange = async (event: DataTablePageEvent) => {
  costStore.updateRowsPerPage(event.rows);
  await costStore.getCostsFromDb(event.page, event.rows);
};

const handleSort = async (event: any) => {
  await costStore.sortCosts(event.sortField, event.sortOrder);
};

const handleFilter = async () => {
  await costStore.filterCosts(filters.value);
};

const getSellerLabel = (supplier: Supplier) => {
  return supplier.firstName;
};

let searchTimeout: NodeJS.Timeout | null = null;

watch(
  () => filters.value.global.value,
  (newValue) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    if (!newValue || newValue.length >= 3) {
      searchTimeout = setTimeout(async () => {
        await costStore.filterCosts(filters.value);
      }, 500);
    }
  }
);
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

  <Panel>
    <DataTable
      v-model:expanded-rows="expandedRows"
      v-model:filters="filters"
      :value="costStore.costs"
      :loading="costStore.loadingCosts"
      striped-rows
      removable-sort
      paginator
      lazy
      :sort-mode="'single'"
      :sort-field="costStore.sortField"
      :sort-order="costStore.sortOrder"
      :rows="costStore.rowsPerPage"
      :total-records="costStore.totalCosts"
      :rows-per-page-options="[5, 10, 20, 50]"
      table-style="min-width: 50rem"
      filter-display="menu"
      :global-filter-fields="['seller.firstName', 'number', 'sellDate']"
      @page="handlePageChange"
      @sort="handleSort"
      @filter="handleFilter"
      paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
      current-page-report-template="Od {first} do {last} (Wszystkich kosztów: {totalRecords})"
      size="small"
    >
      <template #header>
        <div class="flex justify-between py-3">
          <router-link
            :to="{ name: 'Cost', params: { isEdit: 'false', costId: 0 } }"
            class="no-underline"
          >
            <OfficeButton text="Nowy koszt" btn-type="office-regular" />
          </router-link>
          <div class="flex gap-4 items-center">
            <IconField icon-position="left">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText
                v-model="filters['global'].value"
                placeholder="wpisz tutaj..."
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
        <h4 class="text-red-500" v-if="!costStore.loadingCosts">
          Nie znaleziono kosztów...
        </h4>
      </template>

      <template #loading>
        <h4>Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column expander style="width: 5rem" />

      <Column
        field="number"
        header="Nr kosztu"
        :sortable="true"
        sort-field="number"
      >
        <template #filter="{ filterModel }">
          <InputText
            v-model="filterModel.value"
            type="text"
            placeholder="Wpisz tutaj..."
          />
        </template>
      </Column>

      <Column
        header="Sprzedawca"
        :sortable="true"
        sortField="seller.firstName"
        style="min-width: 12rem"
        filter-field="seller"
        :show-filter-match-modes="false"
      >
        <template #body="{ data }">
          <span v-if="data.seller">
            {{ getSellerLabel(data.seller) }}
          </span>
        </template>
        <template #filter="{ filterModel }">
          <MultiSelect
            v-model="filterModel.value"
            :options="supplierStore.getSortedSuppliers"
            :option-label="getSellerLabel"
            placeholder="Wybierz..."
            class="p-column-filter"
            :max-selected-labels="0"
            style="min-width: 12rem; width: 12rem"
          />
        </template>
      </Column>

      <Column
        field="sellDate"
        header="Data sprzedaży"
        :sortable="true"
        data-type="date"
        :show-filter-match-modes="true"
      >
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.sellDate) }}
        </template>
        <template #filter="{ filterModel }">
          <DatePicker
            v-model="filterModel.value"
            dateFormat="yy-mm-dd"
            placeholder="yyyy-dd-mm"
          />
        </template>
      </Column>

      <Column
        field="invoiceDate"
        header="Data wystawienia"
        :sortable="true"
        data-type="date"
      >
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.invoiceDate) }}
        </template>
        <template #filter="{ filterModel }">
          <InputText
            v-model="filterModel.value"
            type="text"
            placeholder="Wpisz tutaj..."
          />
        </template>
      </Column>

      <Column
        field="paymentMethod"
        header="Rodzaj płatności"
        :sortable="true"
      >
        <template #body="{ data }">
          {{ data.paymentMethod }}
        </template>
      </Column>

      <Column
        field="paymentDate"
        header="Termin płatności"
        :sortable="true"
        data-type="date"
      >
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.paymentDate) }}
        </template>
        <template #filter="{ filterModel }">
          <InputText
            v-model="filterModel.value"
            type="text"
            placeholder="Wpisz tutaj..."
          />
        </template>
      </Column>

      <Column
        field="amount"
        header="Wartość"
        style="min-width: 120px"
        dataType="numeric"
        filter-field="amount"
        :show-filter-match-modes="true"
        :show-filter-operator="true"
      >
        <template #body="{ data }">
          {{
            UtilsService.formatCurrency(
              FinanceService.getInvoiceAmount({
                idInvoice: 0,
                customer: null,
                invoiceNumber: "",
                sellDate: data.sellDate,
                invoiceDate: data.invoiceDate,
                paymentDate: data.paymentDate,
                paymentDeadline: 0,
                paymentMethod: data.paymentMethod,
                paymentStatus: data.paymentStatus,
                otherInfo: data.otherInfo,
                invoiceItems: data.costItems,
              } as any)
            )
          }}
        </template>
        <template #filter="{ filterModel }">
          <InputNumber
            v-model="filterModel.value"
            mode="currency"
            currency="PLN"
            locale="pl-PL"
          />
        </template>
      </Column>

      <Column
        field="paymentStatus"
        header="Status"
        style="width: 150px"
        filter-field="paymentStatus"
        :show-filter-match-modes="false"
      >
        <template #body="{ data, field }">
          <Tag
            rounded
            :value="
              data[field] === 'PAID' ? 'Zapłacony' : 'Do zapłaty'
            "
            :severity="data[field] === 'PAID' ? 'success' : 'danger'"
            :icon="
              data[field] === 'PAID'
                ? 'pi pi-check-circle'
                : 'pi pi-times-circle'
            "
            class="cursor-pointer hover:opacity-80 transition-opacity"
            @click="confirmStatusChange(data)"
            :title="'Zmień status kosztu (Zapłacony/Do zapłaty)'"
          />
        </template>
        <template #filter="{ filterModel }">
          <Select
            v-model="filterModel.value"
            :options="[
              { label: 'Zapłacony', value: 'PAID' },
              { label: 'Do zapłaty', value: 'TO_PAY' },
            ]"
            option-label="label"
            option-value="value"
            placeholder="Wybierz..."
            class="p-column-filter"
          />
        </template>
      </Column>

      <Column
        header="Akcja"
        :exportable="false"
        style="min-width: 8rem"
      >
        <template #body="slotProps">
          <div class="flex flex-row gap-1 justify-end">
            <OfficeIconButton
              class="text-orange-500"
              title="Edytuj koszt"
              icon="pi pi-file-edit"
              @click="editItem(slotProps.data)"
            />
            <OfficeIconButton
              title="Usuń koszt"
              icon="pi pi-trash"
              class="text-red-500"
              @click="confirmDeleteCost(slotProps.data)"
            />
          </div>
        </template>
      </Column>

      <template #expansion="slotProps">
        <div class="p-3 flex flex-col">
          <p class="text-center">
            Szczegóły kosztu nr {{ slotProps.data.number }}
          </p>
          <DataTable :value="slotProps.data.costItems">
            <Column field="name">
              <template #header>
                <div class="w-full text-left">Nazwa</div>
              </template>
              <template #body="{ data, field }">
                <p class="text-left">
                  {{ data[field] }}
                </p>
              </template>
            </Column>
            <Column field="unit">
              <template #header>
                <div class="w-full text-center">Jm</div>
              </template>
              <template #body="{ data, field }">
                <p class="text-center">
                  {{ data[field] }}
                </p>
              </template>
            </Column>
            <Column field="quantity">
              <template #header>
                <div class="w-full text-center">Ilość</div>
              </template>
              <template #body="{ data, field }">
                <p class="text-center">
                  {{ data[field] }}
                </p>
              </template>
            </Column>
            <Column field="amount">
              <template #header>
                <div class="w-full text-center">Kwota</div>
              </template>
              <template #body="slotPropsItem">
                <p class="text-center">
                  {{
                    UtilsService.formatCurrency(
                      slotPropsItem.data.amount
                    )
                  }}
                </p>
              </template>
            </Column>
            <Column>
              <template #header>
                <div class="w-full text-center">Wartość</div>
              </template>
              <template #body="slotPropsItem">
                <p class="text-center">
                  {{
                    UtilsService.formatCurrency(
                      slotPropsItem.data.amount *
                        slotPropsItem.data.quantity
                    )
                  }}
                </p>
              </template>
            </Column>
          </DataTable>
          <p class="mt-2 text-center">
            <b>Info:</b> {{ slotProps.data.otherInfo }}
          </p>
        </div>
      </template>
    </DataTable>
  </Panel>
</template>

