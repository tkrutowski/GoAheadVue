<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { FilterMatchMode } from "@primevue/core/api";
import TheMenu from "@/components/TheMenu.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import ToolbarActionButton from "@/components/ToolbarActionButton.vue";
import router from "@/router";
import { useToast } from "primevue/usetoast";
import { useSupplierStore } from "@/stores/suppliers";
import { useCostStore } from "@/stores/costs";
import type { Supplier } from "@/types/Supplier.ts";
import type { Cost } from "@/types/Cost.ts";
import { PaymentStatus } from "@/types/Invoice.ts";
import { UtilsService } from "@/service/UtilsService.ts";
import { FinanceService } from "@/service/FinanceService.ts";
import { TranslationService } from "@/service/TranslationService.ts";
import type { DataTablePageEvent } from "primevue";
import type { DataTableRowContextMenuEvent } from "primevue/datatable";
import type { MenuItem } from "primevue/menuitem";
import ContextMenu from "primevue/contextmenu";
import type { AxiosError } from "axios";
import moment from "moment";

const supplierStore = useSupplierStore();
const costStore = useCostStore();
const toast = useToast();

const toolbarBtnNowa =
  "rounded-full !px-4 !py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide";

const filters = ref();
const initFilters = () => {
  filters.value = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    supplier: { value: null, matchMode: FilterMatchMode.IN },
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
const selectedCosts = ref<Cost[]>([]);
const selectedCost = computed(() =>
  selectedCosts.value?.length === 1 ? selectedCosts.value[0] : null
);

const canEdit = computed(() => {
  if (selectedCosts.value.length !== 1) return false;
  return !selectedCosts.value[0].ksefNumber?.trim();
});

const canDelete = computed(() => selectedCosts.value.length >= 1);

const canPreviewPdfUrl = computed(() => {
  const sel = selectedCosts.value;
  if (sel.length === 0) return false;
  if (sel.length === 1) return !!sel[0].pdfUrl?.trim();
  return sel.some((c) => c.pdfUrl?.trim());
});

const canKsefPdf = computed(() => {
  const sel = selectedCosts.value;
  if (sel.length === 0) return false;
  if (sel.length === 1) return !!sel[0].ksefUrl?.trim();
  return sel.some((c) => c.ksefUrl?.trim());
});

const openPdfBlobFromUrl = async (
  url: string,
  costLabel: string,
  label: string
): Promise<boolean> => {
  try {
    const response = await costStore.getPdfFromS3(url);
    const blobUrl = URL.createObjectURL(response.data);
    window.open(blobUrl, "_blank");
    return true;
  } catch {
    toast.add({
      severity: "error",
      summary: "Błąd",
      detail: `Nie udało się otworzyć ${label} dla kosztu: ${costLabel}`,
      life: 3000,
    });
    return false;
  }
};

const handleOpenCostPdfUrls = async () => {
  const withUrl = selectedCosts.value.filter((c) => c.pdfUrl?.trim());
  if (!withUrl.length) return;
  let opened = 0;
  for (const c of withUrl) {
    const ok = await openPdfBlobFromUrl(c.pdfUrl!, c.number || "—", "PDF");
    if (ok) opened++;
  }
  if (opened > 1) {
    toast.add({
      severity: "info",
      summary: "PDF",
      detail:
        "Otwarto " +
        opened +
        " plików PDF. Jeśli część okien się nie pojawiła, sprawdź blokadę wyskakujących okien w przeglądarce.",
      life: 5000,
    });
  }
};

const handleOpenKsefPdfs = async () => {
  const withUrl = selectedCosts.value.filter((c) => c.ksefUrl?.trim());
  if (!withUrl.length) return;
  let opened = 0;
  for (const c of withUrl) {
    const ok = await openPdfBlobFromUrl(c.ksefUrl!, c.number || "—", "KSeF PDF");
    if (ok) opened++;
  }
  if (opened > 1) {
    toast.add({
      severity: "info",
      summary: "KSeF PDF",
      detail:
        "Otwarto " +
        opened +
        " plików PDF. Jeśli część okien się nie pojawiła, sprawdź blokadę wyskakujących okien w przeglądarce.",
      life: 5000,
    });
  }
};

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
const costsToDelete = ref<Cost[]>([]);

const confirmDeleteSelectedCosts = () => {
  if (selectedCosts.value.length === 0) return;
  costsToDelete.value = [...selectedCosts.value];
  showDeleteConfirmationDialog.value = true;
};

const deleteConfirmationMessage = computed(() => {
  const list = costsToDelete.value;
  if (!list.length) return "No message";
  if (list.length === 1) {
    return `Czy chcesz usunąć koszt nr <b>${list[0].number}</b>?`;
  }
  const maxShow = 8;
  const nums = list.slice(0, maxShow).map((c) => c.number).join(", ");
  const more =
    list.length > maxShow
      ? ` <span class="text-surface-500">(+${list.length - maxShow} więcej)</span>`
      : "";
  return `Czy chcesz usunąć <b>${list.length}</b> kosztów?<br/><span class="text-sm">${nums}${more}</span>`;
});

const submitDelete = async () => {
  const toDelete = costsToDelete.value;
  if (!toDelete.length) {
    showDeleteConfirmationDialog.value = false;
    return;
  }
  const ids = toDelete.map((c) => c.id);
  try {
    await costStore.deleteCostsDb(ids);
    toast.add({
      severity: "success",
      summary: "Potwierdzenie",
      detail:
        ids.length === 1
          ? "Usunięto koszt nr: " + toDelete[0].number
          : `Usunięto ${ids.length} kosztów.`,
      life: 3000,
    });
    selectedCosts.value = [];
  } catch {
    toast.add({
      severity: "error",
      summary: "Błąd",
      detail:
        ids.length === 1
          ? "Nie usunięto kosztu nr: " + toDelete[0].number
          : "Nie udało się usunąć wybranych kosztów.",
      life: 4000,
    });
  } finally {
    showDeleteConfirmationDialog.value = false;
    costsToDelete.value = [];
  }
};

const editItem = (item: Cost) => {
  const costItem: Cost = JSON.parse(JSON.stringify(item));
  router.push({
    name: "Cost",
    params: { isEdit: "true", costId: costItem.id },
  });
};

// —— Dialog KSeF ——
const showKsefDialog = ref(false);
const ksefDateFrom = ref<Date>(new Date());
const ksefDateTo = ref<Date>(new Date());
const ksefPreviewList = ref<Cost[]>([]);
const ksefRowSelected = ref<boolean[]>([]);
const loadingKsefPreview = ref(false);

function currentMonthRange(): [Date, Date] {
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), 1);
  const end = new Date(n.getFullYear(), n.getMonth() + 1, 0);
  return [start, end];
}

function openKsefCheckDialog() {
  const [a, b] = currentMonthRange();
  ksefDateFrom.value = a;
  ksefDateTo.value = b;
  ksefPreviewList.value = [];
  ksefRowSelected.value = [];
  showKsefDialog.value = true;
}

async function searchKsefCosts() {
  loadingKsefPreview.value = true;
  try {
    const from = moment(ksefDateFrom.value).format("YYYY-MM-DD");
    const to = moment(ksefDateTo.value).format("YYYY-MM-DD");
    const list = await costStore.fetchKsefNewCostsPreview(from, to);
    if (!list.length) {
      toast.add({
        severity: "info",
        summary: "KSeF",
        detail: "Brak nowych kosztów w KSeF w wybranym okresie.",
        life: 4000,
      });
      ksefPreviewList.value = [];
      ksefRowSelected.value = [];
      return;
    }
    ksefPreviewList.value = list;
    ksefRowSelected.value = list.map(() => true);
  } catch (e: unknown) {
    const err = e as AxiosError<{ message?: string }>;
    toast.add({
      severity: "error",
      summary: "Błąd",
      detail:
        err?.response?.data?.message ??
        err?.message ??
        "Nie udało się pobrać danych z KSeF.",
      life: 5000,
    });
  } finally {
    loadingKsefPreview.value = false;
  }
}

function previewCostLabel(cost: Cost): string {
  if (cost.number?.trim()) return cost.number;
  if (cost.supplier?.name?.trim()) return cost.supplier.name;
  return "Koszt";
}

function previewCostGross(cost: Cost): number {
  return FinanceService.getCostTotalGross(cost);
}

async function saveSelectedKsefCosts() {
  const indices = ksefRowSelected.value
    .map((sel, i) => (sel ? i : -1))
    .filter((i) => i >= 0);
  if (!indices.length) {
    toast.add({
      severity: "warn",
      summary: "Wybór",
      detail: "Zaznacz co najmniej jeden koszt.",
      life: 3000,
    });
    return;
  }
  let saved = 0;
  for (const i of indices) {
    const raw = ksefPreviewList.value[i];
    const cost = JSON.parse(JSON.stringify(raw)) as Cost;
    cost.id = 0;
    try {
      await costStore.addCostDb(cost, { skipListRefresh: true });
      saved++;
    } catch (reason: unknown) {
      const ax = reason as AxiosError<{ message?: string }>;
      toast.add({
        severity: "error",
        summary: "Błąd zapisu",
        detail:
          ax?.response?.data?.message ??
          ax?.message ??
          "Nie udało się zapisać kosztu.",
        life: 5000,
      });
      return;
    }
  }
  await costStore.getCostsFromDb(costStore.currentPage);
  toast.add({
    severity: "success",
    summary: "Potwierdzenie",
    detail: saved === 1 ? "Zapisano koszt." : `Zapisano ${saved} kosztów.`,
    life: 3000,
  });
  showKsefDialog.value = false;
  ksefPreviewList.value = [];
  ksefRowSelected.value = [];
}

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

//
// —— Context menu (wiersz) ——
//
const costRowContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const contextMenuCost = ref<Cost | null>(null);

const onCostContextMenuHide = () => {
  contextMenuCost.value = null;
};

const onCostRowContextMenu = async (event: DataTableRowContextMenuEvent) => {
  const row = event.data as Cost;
  const inSelection = selectedCosts.value.some((c) => c.id === row.id);
  if (!inSelection) {
    selectedCosts.value = [row];
  }
  contextMenuCost.value = row;
  await nextTick();
  costRowContextMenu.value?.show(event.originalEvent);
};

const costRowMenuModel = computed((): MenuItem[] => [
  {
    label: "Edytuj",
    icon: "pi pi-pencil",
    disabled: !canEdit.value,
    command: () => {
      if (selectedCost.value) editItem(selectedCost.value);
    },
  },
  {
    label: "Usuń",
    icon: "pi pi-trash",
    disabled: !canDelete.value,
    command: () => confirmDeleteSelectedCosts(),
  },
  { separator: true },
  {
    label: "Sprawdź KSeF",
    icon: "pi pi-send",
    command: () => openKsefCheckDialog(),
  },
  { separator: true },
  {
    label: "PDF",
    icon: "pi pi-file-pdf",
    disabled: !canPreviewPdfUrl.value,
    command: () => handleOpenCostPdfUrls(),
  },
  {
    label: "KSeF PDF",
    icon: "pi pi-file-pdf",
    disabled: !canKsefPdf.value,
    command: () => handleOpenKsefPdfs(),
  },
]);

const getSellerLabel = (supplier: Supplier) => {
  return supplier.name;
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

  <ContextMenu
    ref="costRowContextMenu"
    :model="costRowMenuModel"
    @hide="onCostContextMenuHide"
  />

  <Dialog
    v-model:visible="showKsefDialog"
    modal
    header="Sprawdź KSeF"
    class="w-full max-w-3xl"
    :dismissable-mask="true"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div class="flex flex-col gap-1">
          <label for="ksef-from" class="text-sm text-surface-600 dark:text-surface-400"
            >Data od</label
          >
          <DatePicker
            id="ksef-from"
            v-model="ksefDateFrom"
            date-format="yy-mm-dd"
            show-icon
            fluid
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="ksef-to" class="text-sm text-surface-600 dark:text-surface-400"
            >Data do</label
          >
          <DatePicker
            id="ksef-to"
            v-model="ksefDateTo"
            date-format="yy-mm-dd"
            show-icon
            fluid
          />
        </div>
        <Button
          type="button"
          label="Pobierz z KSeF"
          icon="pi pi-search"
          :loading="loadingKsefPreview"
          class="sm:ml-0"
          @click="searchKsefCosts"
        />
      </div>

      <div
        v-if="ksefPreviewList.length > 0"
        class="grid gap-3 sm:grid-cols-1 md:grid-cols-2"
      >
        <div
          v-for="(row, idx) in ksefPreviewList"
          :key="idx"
          class="flex flex-col gap-2 rounded-xl border border-surface-200 bg-surface-0 p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900"
        >
          <div class="flex items-start gap-3">
            <input
              :id="'ksef-cb-' + idx"
              :checked="ksefRowSelected[idx]"
              type="checkbox"
              class="mt-1 h-4 w-4 shrink-0 rounded border-surface-300 text-primary focus:ring-primary dark:border-surface-600"
              @change="
                ksefRowSelected[idx] = ($event.target as HTMLInputElement).checked
              "
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-surface-900 dark:text-surface-0">
                {{ previewCostLabel(row) }}
              </p>
              <p class="mt-1 text-xs text-surface-600 dark:text-surface-400">
                Data wystawienia:
                {{
                  row.invoiceDate
                    ? UtilsService.formatDateToString(row.invoiceDate)
                    : "—"
                }}
              </p>
              <p class="mt-2 text-base font-semibold text-surface-800 dark:text-surface-100">
                {{ UtilsService.formatCurrency(previewCostGross(row)) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="ksefPreviewList.length > 0" class="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          label="Anuluj"
          severity="secondary"
          outlined
          @click="showKsefDialog = false"
        />
        <Button type="button" label="Zapisz" icon="pi pi-check" @click="saveSelectedKsefCosts" />
      </div>
    </div>
  </Dialog>

  <Panel>
    <div
      class="mb-3 flex flex-col gap-3 rounded-lg border border-surface-200 bg-surface-100 px-4 py-2 shadow dark:border-surface-700 dark:bg-surface-800 lg:flex-row lg:items-center lg:gap-3"
    >
      <div class="flex shrink-0 items-center justify-start">
        <router-link
          :to="{ name: 'Cost', params: { isEdit: 'false', costId: 0 } }"
          class="no-underline"
        >
          <Button
            type="button"
            label="Nowa"
            icon="pi pi-plus"
            size="small"
            outlined
            :class="toolbarBtnNowa"
            title="Dodaj nowy koszt"
          />
        </router-link>
      </div>
      <div class="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2 overflow-x-auto py-0.5">
        <ToolbarActionButton
          label="Edytuj"
          icon="pi pi-pencil"
          variant="orange"
          :disabled="!canEdit"
          title="Edytuj koszt"
          @click="selectedCost && editItem(selectedCost)"
        />
        <ToolbarActionButton
          label="Usuń"
          icon="pi pi-trash"
          variant="red"
          :disabled="!canDelete"
          title="Usuń zaznaczone koszty"
          @click="confirmDeleteSelectedCosts"
        />
        <div
          class="mx-0.5 h-8 shrink-0 self-center border-l border-surface-400 dark:border-surface-500"
          aria-hidden="true"
        />
        <ToolbarActionButton
          label="Sprawdź KSeF"
          icon="pi pi-send"
          variant="green"
          title="Pobierz nowe koszty z KSeF dla zakresu dat"
          @click="openKsefCheckDialog"
        />
        <div
          class="mx-0.5 h-8 shrink-0 self-center border-l border-surface-400 dark:border-surface-500"
          aria-hidden="true"
        />
        <ToolbarActionButton
          label="PDF"
          icon="pi pi-file-pdf"
          variant="orange"
          :disabled="!canPreviewPdfUrl"
          title="Otwórz wygenerowany PDF"
          @click="handleOpenCostPdfUrls"
        />
        <ToolbarActionButton
          label="KSeF PDF"
          icon="pi pi-file-pdf"
          variant="orange"
          :disabled="!canKsefPdf"
          title="Otwórz PDF wygenerowany przez KSeF"
          @click="handleOpenKsefPdfs"
        />
      </div>
      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <IconField icon-position="left">
          <InputIcon>
            <i class="pi pi-search" />
          </InputIcon>
          <InputText
            v-model="filters['global'].value"
            placeholder="wpisz tutaj..."
            class="w-48"
          />
        </IconField>
        <Button
          type="button"
          icon="pi pi-filter-slash"
          outlined
          size="small"
          class="!rounded-full disabled:!bg-surface-300 disabled:!text-surface-500 dark:disabled:!bg-surface-600 dark:disabled:!text-surface-400"
          title="Wyczyść filtry"
          @click="clearFilter()"
        />
        <ProgressSpinner
          v-if="costStore.loadingCosts"
          class="h-8 w-8"
          stroke-width="4"
        />
      </div>
    </div>

    <DataTable
      v-model:selection="selectedCosts"
      v-model:context-menu-selection="contextMenuCost"
      v-model:expanded-rows="expandedRows"
      v-model:filters="filters"
      :value="costStore.costs"
      :loading="costStore.loadingCosts"
      context-menu
      data-key="id"
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
      selection-mode="multiple"
      :global-filter-fields="['supplier.name', 'number', 'sellDate']"
      @page="handlePageChange"
      @sort="handleSort"
      @filter="handleFilter"
      @row-contextmenu="onCostRowContextMenu"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
      current-page-report-template="Od {first} do {last} (Wszystkich kosztów: {totalRecords})"
      size="small"
    >
      <template #empty>
        <h4 v-if="!costStore.loadingCosts" class="text-red-500">
          Nie znaleziono kosztów...
        </h4>
      </template>

      <template #loading>
        <h4>Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column selection-mode="multiple" :exportable="false" style="width: 3rem" />
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
        sort-field="supplier.name"
        style="min-width: 12rem"
        filter-field="supplier"
        :show-filter-match-modes="false"
      >
        <template #body="{ data }">
          <span v-if="data.supplier">
            {{ getSellerLabel(data.supplier) }}
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
            date-format="yy-mm-dd"
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
          {{
            TranslationService.translateEnum(
              "PaymentMethod",
              data.paymentMethod
            )
          }}
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
        data-type="numeric"
        filter-field="amount"
        :show-filter-match-modes="true"
        :show-filter-operator="true"
      >
        <template #body="{ data }">
          {{
            UtilsService.formatCurrency(
              FinanceService.getCostTotalGross(data)
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
            class="cursor-pointer transition-opacity hover:opacity-80"
            :title="'Zmień status kosztu (Zapłacony/Do zapłaty)'"
            @click="confirmStatusChange(data)"
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

      <template #expansion="slotProps">
        <div class="flex flex-col p-3">
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
            <Column field="amountNet">
              <template #header>
                <div class="w-full text-center">Kwota netto / j.</div>
              </template>
              <template #body="slotPropsItem">
                <p class="text-center">
                  {{
                    UtilsService.formatCurrency(
                      slotPropsItem.data.amountNet
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
                      FinanceService.getCostItemGross(slotPropsItem.data)
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
