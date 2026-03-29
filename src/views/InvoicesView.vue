<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue";
import {FilterMatchMode} from '@primevue/core/api';
import {type Invoice, PaymentStatus} from "@/types/Invoice";
import TheMenu from "@/components/TheMenu.vue";
import ToolbarActionButton from "@/components/ToolbarActionButton.vue";
import router from "@/router";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import {useToast} from "primevue/usetoast";
import {useCustomerStore} from "@/stores/customers";
import {useInvoiceStore} from "@/stores/invoices";
import {type Customer} from "@/types/Customer.ts";
import {UtilsService} from "../service/UtilsService.ts";
import {AxiosError} from "axios";
import {TranslationService} from "../service/TranslationService.ts";
import {FinanceService} from "../service/FinanceService.ts";
import type {DataTablePageEvent} from "primevue";
import type {DataTableRowContextMenuEvent} from "primevue/datatable";
import type {MenuItem} from "primevue/menuitem";
import ContextMenu from "primevue/contextmenu";

const customerStore = useCustomerStore();

const invoiceStore = useInvoiceStore();
const toast = useToast();

const toolbarBtnNowa =
  "rounded-full !px-4 !py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide";

//filter
const filters = ref();
const initFilters = () => {
  filters.value = {
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
    customer: {value: null, matchMode: FilterMatchMode.IN},
    sellDate: {constraints: [{ value: null, matchMode: FilterMatchMode.DATE_AFTER }],},
    invoiceDate: {constraints: [{ value: null, matchMode: FilterMatchMode.DATE_AFTER }],},
    paymentDate: {constraints: [{ value: null, matchMode: FilterMatchMode.DATE_AFTER }],},
    amount: {constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }],},
    number: {value: null, matchMode: FilterMatchMode.CONTAINS},
    paymentStatus: {value: null, matchMode: FilterMatchMode.EQUALS},
  };
}
initFilters();
const clearFilter = async () => {
  initFilters();
  await invoiceStore.filterInvoices(filters.value);
};

const expandedRows = ref([]);
const selectedInvoices = ref<Invoice[]>([]);
const selectedInvoice = computed(() =>
  selectedInvoices.value?.length === 1 ? selectedInvoices.value[0] : null
);
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
const invoicesToDelete = ref<Invoice[]>([]);

const confirmDeleteInvoices = () => {
  if (selectedInvoices.value.length === 0) return;
  invoicesToDelete.value = [...selectedInvoices.value];
  showDeleteConfirmationDialog.value = true;
};

const deleteConfirmationMessage = computed(() => {
  const list = invoicesToDelete.value;
  if (!list.length) return "No message";
  if (list.length === 1) {
    return `Czy chcesz usunąć fakturę nr <b>${list[0].invoiceNumber}</b>?`;
  }
  const maxShow = 8;
  const nums = list.slice(0, maxShow).map((i) => i.invoiceNumber).join(", ");
  const more =
    list.length > maxShow ? ` <span class="text-surface-500">(+${list.length - maxShow} więcej)</span>` : "";
  return `Czy chcesz usunąć <b>${list.length}</b> faktur?<br/><span class="text-sm">${nums}${more}</span>`;
});

const submitDelete = async () => {
  const toDelete = invoicesToDelete.value;
  if (!toDelete.length) {
    showDeleteConfirmationDialog.value = false;
    return;
  }
  const ids = toDelete.map((i) => i.idInvoice);
  try {
    await invoiceStore.deleteInvoicesDb(ids);
    toast.add({
      severity: "success",
      summary: "Potwierdzenie",
      detail:
        ids.length === 1
          ? "Usunięto fakturę nr: " + toDelete[0].invoiceNumber
          : `Usunięto ${ids.length} faktur.`,
      life: 3000,
    });
    selectedInvoices.value = [];
  } catch {
    toast.add({
      severity: "error",
      summary: "Błąd",
      detail:
        ids.length === 1
          ? "Nie usunięto faktury nr: " + toDelete[0].invoiceNumber
          : "Nie udało się usunąć wybranych faktur.",
      life: 4000,
    });
  } finally {
    showDeleteConfirmationDialog.value = false;
    invoicesToDelete.value = [];
  }
};

//
//-------------------------------------------------GENERATE / PREVIEW PDF-------------------------------------------------
//
const generatePdfDownload = (idInvoice: number, invoiceNumber: string) => {
  console.log("START - generatePdfDownload for ", invoiceNumber);
  invoiceStore
    .getInvoicePdfFromDb(idInvoice)
    .then((response) => {
      const fileURL = window.URL.createObjectURL(new Blob([response.data]));
      const fileLink = document.createElement("a");
      fileLink.href = fileURL;
      fileLink.setAttribute("download", "faktura_" + invoiceNumber + ".pdf");
      document.body.appendChild(fileLink);
      fileLink.click();
    })
    .catch(() => {
      toast.add({
        severity: "error",
        summary: "Błąd",
        detail: "Nie udało się utworzyć PDF dla faktury nr: " + invoiceNumber,
        life: 3000,
      });
    })
    .finally(() => {
      invoiceStore.loadingFile = false;
      console.log("END - generatePdfDownload for ", invoiceNumber);
    });
};

// —— Podgląd PDF w aplikacji (bez nowych kart; przeglądarki nie obsługują niezawodnie „kart w tle”) ——
type PdfPreviewItem = { label: string; blobUrl: string };

const showPdfPreviewDialog = ref(false);
const pdfPreviewTitle = ref("");
const pdfPreviewItems = ref<PdfPreviewItem[]>([]);
const pdfPreviewBlobUrlsToRevoke = ref<string[]>([]);
const pdfPreviewActiveIndex = ref(0);
const loadingPdfPreview = ref(false);

const pdfPreviewSelectOptions = computed(() =>
  pdfPreviewItems.value.map((item, i) => ({ label: item.label, value: i }))
);

const currentPdfPreviewSrc = computed(
  () => pdfPreviewItems.value[pdfPreviewActiveIndex.value]?.blobUrl ?? ""
);

const revokePdfPreviewUrls = () => {
  for (const u of pdfPreviewBlobUrlsToRevoke.value) {
    URL.revokeObjectURL(u);
  }
  pdfPreviewBlobUrlsToRevoke.value = [];
  pdfPreviewItems.value = [];
};

const onPdfPreviewDialogHide = () => {
  revokePdfPreviewUrls();
  pdfPreviewActiveIndex.value = 0;
  loadingPdfPreview.value = false;
};

const formatInvoiceNumbersForToast = (numbers: string[], maxShow = 14) => {
  if (numbers.length <= maxShow) return numbers.join(", ");
  const head = numbers.slice(0, maxShow).join(", ");
  return `${head} (+${numbers.length - maxShow} więcej)`;
};

/** Wczytuje PDF-y z S3 i pokazuje je w oknie dialogowym (użytkownik zostaje w aplikacji). */
const openPdfsInAppDialog = async (
  title: string,
  entries: { url: string; invoiceNumber: string; docLabel: string }[]
) => {
  if (!entries.length) return;
  revokePdfPreviewUrls();
  pdfPreviewTitle.value = title;
  pdfPreviewActiveIndex.value = 0;
  loadingPdfPreview.value = true;
  showPdfPreviewDialog.value = true;

  const items: PdfPreviewItem[] = [];
  const failedNumbers: string[] = [];

  try {
    for (const e of entries) {
      try {
        const response = await invoiceStore.getPdfFromS3(e.url);
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(pdfBlob);
        pdfPreviewBlobUrlsToRevoke.value.push(blobUrl);
        items.push({
          label: `${e.docLabel} · ${e.invoiceNumber}`,
          blobUrl,
        });
      } catch {
        failedNumbers.push(e.invoiceNumber);
      }
    }

    pdfPreviewItems.value = items;

    if (items.length === 0) {
      revokePdfPreviewUrls();
      showPdfPreviewDialog.value = false;
      toast.add({
        severity: "error",
        summary: "Błąd PDF",
        detail: `Nie udało się wczytać PDF dla faktur: ${formatInvoiceNumbersForToast(failedNumbers)}.`,
        life: 8000,
      });
      return;
    }

    if (failedNumbers.length > 0) {
      toast.add({
        severity: "warn",
        summary: "Część plików niedostępna",
        detail: `Brak PDF dla faktur: ${formatInvoiceNumbersForToast(failedNumbers)}. Pozostałe dokumenty są w podglądzie.`,
        life: 9000,
      });
    }
  } finally {
    loadingPdfPreview.value = false;
  }
};

onUnmounted(() => {
  revokePdfPreviewUrls();
});


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

onMounted( async () => {
  if (customerStore.customers.length <= 1) customerStore.getCustomersFromDb("ALL");
  if (invoiceStore.invoices.length === 0 && !invoiceStore.loadingInvoices) {
    await invoiceStore.filterInvoices(filters.value);
  }
});

const handlePageChange = async (event: DataTablePageEvent) => {
  console.log('handlePageChange()', event);
  invoiceStore.updateRowsPerPage(event.rows);
  await invoiceStore.getInvoicesFromDb(event.page, event.rows);
};

const handleSort = async (event: any) => {
  console.log('handleSort()', event);
  await invoiceStore.sortInvoices(event.sortField, event.sortOrder);
};

const handleFilter = async () => {
  console.log('handleFilter()', filters.value);
  await invoiceStore.filterInvoices(filters.value);
};

const getCustomerLabel = (customer: Customer) => {
  return `${customer.name} ${customer.firstName}`;
}

// Obsługa wyszukiwania globalnego z debounce
let searchTimeout: NodeJS.Timeout | null = null;

watch(
  () => filters.value.global.value,
  newValue => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Search when value has more than 3 letters or is empty
    if (!newValue || newValue.length >= 3) {
      searchTimeout = setTimeout(async () => {
        console.log('Global search:', newValue);
        await invoiceStore.filterInvoices(filters.value);
      }, 500); // 500ms debounce
    }
  }
);

// Toolbar: reguły włączenia przycisków
const canEdit = computed(() => {
  if (selectedInvoices.value.length !== 1) return false;
  return !selectedInvoices.value[0].ksefNumber?.trim();
});

const canDelete = computed(() => selectedInvoices.value.length >= 1);

const canGeneratePdf = computed(() => selectedInvoices.value.length === 1);

const canPreviewPdfUrl = computed(() => {
  const sel = selectedInvoices.value;
  if (sel.length === 0) return false;
  if (sel.length === 1) return !!sel[0].pdfUrl?.trim();
  return sel.some((inv) => inv.pdfUrl?.trim());
});

const canKsef = computed(() => {
  const sel = selectedInvoices.value;
  if (sel.length === 0) return false;
  if (sel.length === 1) return !sel[0].ksefNumber?.trim();
  return sel.some((inv) => !inv.ksefNumber?.trim());
});

const canUpo = computed(() => {
  const sel = selectedInvoices.value;
  if (sel.length === 0) return false;
  if (sel.length === 1) return !sel[0].upoUrl?.trim();
  return sel.some((inv) => !inv.upoUrl?.trim());
});

const canKsefPdf = computed(() => {
  const sel = selectedInvoices.value;
  if (sel.length === 0) return false;
  if (sel.length === 1) return !!sel[0].ksefUrl?.trim();
  return sel.some((inv) => inv.ksefUrl?.trim());
});

const canUpoPdf = computed(() => {
  const sel = selectedInvoices.value;
  if (sel.length === 0) return false;
  if (sel.length === 1) return !!sel[0].upoUrl?.trim();
  return sel.some((inv) => inv.upoUrl?.trim());
});

const handleOpenInvoicePdfUrls = async () => {
  const withUrl = selectedInvoices.value.filter((inv) => inv.pdfUrl?.trim());
  if (!withUrl.length) return;
  await openPdfsInAppDialog(
    "PDF faktury",
    withUrl.map((inv) => ({
      url: inv.pdfUrl!,
      invoiceNumber: inv.invoiceNumber,
      docLabel: "PDF",
    }))
  );
};

const handleOpenKsefPdfs = async () => {
  const withUrl = selectedInvoices.value.filter((inv) => inv.ksefUrl?.trim());
  if (!withUrl.length) return;
  await openPdfsInAppDialog(
    "PDF KSeF",
    withUrl.map((inv) => ({
      url: inv.ksefUrl!,
      invoiceNumber: inv.invoiceNumber,
      docLabel: "KSeF",
    }))
  );
};

const handleOpenUpoPdfs = async () => {
  const withUrl = selectedInvoices.value.filter((inv) => inv.upoUrl?.trim());
  if (!withUrl.length) return;
  await openPdfsInAppDialog(
    "PDF UPO",
    withUrl.map((inv) => ({
      url: inv.upoUrl!,
      invoiceNumber: inv.invoiceNumber,
      docLabel: "UPO",
    }))
  );
};

const handleSendToKsef = async () => {
  const ids = selectedInvoices.value
    .filter((inv) => !inv.ksefNumber?.trim())
    .map((inv) => inv.idInvoice);
  if (!ids.length) return;
  try {
    await invoiceStore.sendInvoicesToKsef(ids);
    toast.add({
      severity: "success",
      summary: "KSeF",
      detail: "Wysłano faktury do KSeF.",
      life: 3000,
    });
  } catch (err: any) {
    toast.add({
      severity: "error",
      summary: "Błąd KSeF",
      detail: err?.message || "Nie udało się wysłać faktur do KSeF.",
      life: 5000,
    });
  }
};

const handleDownloadUpo = async () => {
  const ids = selectedInvoices.value
    .filter((inv) => !inv.upoUrl?.trim())
    .map((inv) => inv.idInvoice);
  if (!ids.length) return;
  try {
    await invoiceStore.downloadUpoConfirmation(ids);
    toast.add({
      severity: "success",
      summary: "UPO",
      detail: "Pobrano potwierdzenia UPO.",
      life: 3000,
    });
  } catch (err: any) {
    toast.add({
      severity: "error",
      summary: "Błąd UPO",
      detail: err?.message || "Nie udało się pobrać potwierdzeń UPO.",
      life: 5000,
    });
  }
};

//
//-------------------------------------------------CONTEXT MENU (wiersz)----------------------------------------------
//
const invoiceRowContextMenu = ref<InstanceType<typeof ContextMenu> | null>(null);
const contextMenuInvoice = ref<Invoice | null>(null);

const onInvoiceContextMenuHide = () => {
  contextMenuInvoice.value = null;
};

const onInvoiceRowContextMenu = async (event: DataTableRowContextMenuEvent) => {
  const row = event.data as Invoice;
  const inSelection = selectedInvoices.value.some((i) => i.idInvoice === row.idInvoice);
  if (!inSelection) {
    selectedInvoices.value = [row];
  }
  contextMenuInvoice.value = row;
  await nextTick();
  invoiceRowContextMenu.value?.show(event.originalEvent);
};

const invoiceRowMenuModel = computed((): MenuItem[] => [
  {
    label: "Edytuj",
    icon: "pi pi-pencil",
    disabled: !canEdit.value,
    command: () => {
      if (selectedInvoice.value) editItem(selectedInvoice.value);
    },
  },
  {
    label: "Usuń",
    icon: "pi pi-trash",
    disabled: !canDelete.value,
    command: () => confirmDeleteInvoices(),
  },
  {
    label: "Generuj PDF",
    icon: "pi pi-file-export",
    disabled: !canGeneratePdf.value || invoiceStore.loadingFile,
    command: () => {
      if (selectedInvoice.value) {
        generatePdfDownload(selectedInvoice.value.idInvoice, selectedInvoice.value.invoiceNumber);
      }
    },
  },
  { separator: true },
  {
    label: "KSeF",
    icon: "pi pi-send",
    disabled: !canKsef.value,
    command: () => handleSendToKsef(),
  },
  {
    label: "UPO",
    icon: "pi pi-download",
    disabled: !canUpo.value,
    command: () => handleDownloadUpo(),
  },
  { separator: true },
  {
    label: "PDF",
    icon: "pi pi-file-pdf",
    disabled: !canPreviewPdfUrl.value,
    command: () => handleOpenInvoicePdfUrls(),
  },
  {
    label: "KSeF PDF",
    icon: "pi pi-file-pdf",
    disabled: !canKsefPdf.value,
    command: () => handleOpenKsefPdfs(),
  },
  {
    label: "UPO PDF",
    icon: "pi pi-file-pdf",
    disabled: !canUpoPdf.value,
    command: () => handleOpenUpoPdfs(),
  },
]);

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

  <Dialog
    v-model:visible="showPdfPreviewDialog"
    modal
    :header="pdfPreviewTitle"
    class="w-full max-w-[min(96vw,1200px)]"
    :dismissable-mask="true"
    :closable="!loadingPdfPreview"
    :close-on-escape="!loadingPdfPreview"
    maximizable
    @hide="onPdfPreviewDialogHide"
  >
    <div class="flex min-h-[70vh] flex-col gap-3">
      <div
        v-if="loadingPdfPreview"
        class="flex flex-1 items-center justify-center py-24"
      >
        <ProgressSpinner class="h-16 w-16" stroke-width="4" />
      </div>
      <template v-else>
        <Select
          v-if="pdfPreviewItems.length > 1"
          v-model="pdfPreviewActiveIndex"
          :options="pdfPreviewSelectOptions"
          option-label="label"
          option-value="value"
          placeholder="Wybierz dokument"
          class="w-full max-w-md"
        />
        <iframe
          v-if="currentPdfPreviewSrc"
          :key="pdfPreviewActiveIndex"
          :src="currentPdfPreviewSrc"
          class="min-h-[65vh] w-full flex-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900"
          title="Podgląd PDF"
        />
      </template>
    </div>
  </Dialog>

  <ContextMenu
      ref="invoiceRowContextMenu"
      :model="invoiceRowMenuModel"
      @hide="onInvoiceContextMenuHide"
  />

  <Panel>
    <!-- Toolbar: Nowa (wąsko) | akcje (rozciąga się) | wyszukiwanie (wąsko) -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3 rounded-lg shadow px-4 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 mb-3">
      <div class="flex shrink-0 items-center justify-start">
        <router-link :to="{ name: 'Invoice', params: { isEdit: 'false', invoiceId: 0 } }" class="no-underline">
          <Button type="button" label="Nowa" icon="pi pi-plus" size="small" outlined :class="toolbarBtnNowa" title="Dodaj nową fakturę" />
        </router-link>
      </div>
      <div class="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2 overflow-x-auto py-0.5">
        <ToolbarActionButton
          label="Edytuj"
          icon="pi pi-pencil"
          variant="orange"
          :disabled="!canEdit"
          title="Edytuj fakturę"
          @click="selectedInvoice && editItem(selectedInvoice)"
        />
        <ToolbarActionButton
          label="Usuń"
          icon="pi pi-trash"
          variant="red"
          :disabled="!canDelete"
          title="Usuń zaznaczone faktury"
          @click="confirmDeleteInvoices"
        />
        <ToolbarActionButton
          label="Generuj PDF"
          icon="pi pi-file-export"
          variant="orange"
          :disabled="!canGeneratePdf"
          :loading="invoiceStore.loadingFile"
          title="Wygeneruj i pobierz PDF (jedna zaznaczona faktura)"
          @click="selectedInvoice && generatePdfDownload(selectedInvoice.idInvoice, selectedInvoice.invoiceNumber)"
        />
        <div class="border-l border-surface-400 dark:border-surface-500 h-8 shrink-0 self-center mx-0.5" aria-hidden="true" />
        <ToolbarActionButton
          label="KSeF"
          icon="pi pi-send"
          variant="green"
          :disabled="!canKsef"
          title="Wyślij do KSeF zaznaczone faktury"
          @click="handleSendToKsef"
        />
        <ToolbarActionButton
          label="UPO"
          icon="pi pi-download"
          variant="green"
          :disabled="!canUpo"
          title="Pobierz potwierdzenie UPO dla zaznaczonych faktur"
          @click="handleDownloadUpo"
        />
        <div class="border-l border-surface-400 dark:border-surface-500 h-8 shrink-0 self-center mx-0.5" aria-hidden="true" />
        <ToolbarActionButton
          label="PDF"
          icon="pi pi-file-pdf"
          variant="orange"
          :disabled="!canPreviewPdfUrl"
          title="Podgląd wygenerowanego PDF w oknie aplikacji"
          @click="handleOpenInvoicePdfUrls"
        />
        <ToolbarActionButton
          label="KSeF PDF"
          icon="pi pi-file-pdf"
          variant="orange"
          :disabled="!canKsefPdf"
          title="Podgląd PDF z KSeF w oknie aplikacji"
          @click="handleOpenKsefPdfs"
        />
        <ToolbarActionButton
          label="UPO PDF"
          icon="pi pi-file-pdf"
          variant="orange"
          :disabled="!canUpoPdf"
          title="Podgląd PDF potwierdzenia UPO w oknie aplikacji"
          @click="handleOpenUpoPdfs"
        />
      </div>
      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <IconField icon-position="left">
          <InputIcon>
            <i class="pi pi-search" />
          </InputIcon>
          <InputText v-model="filters['global'].value" placeholder="wpisz tutaj..." class="w-48" />
        </IconField>
        <Button type="button" icon="pi pi-filter-slash" outlined size="small" class="!rounded-full disabled:!bg-surface-300 disabled:!text-surface-500 dark:disabled:!bg-surface-600 dark:disabled:!text-surface-400" title="Wyczyść filtry" @click="clearFilter()" />
        <ProgressSpinner v-if="invoiceStore.loadingInvoices" class="w-8 h-8" stroke-width="4" />
      </div>
    </div>

    <DataTable
        v-model:selection="selectedInvoices"
        v-model:context-menu-selection="contextMenuInvoice"
        v-model:expanded-rows="expandedRows"
        v-model:filters="filters"
        :value="invoiceStore.invoices"
        :loading="invoiceStore.loadingInvoices"
        context-menu
        selection-mode="multiple"
        data-key="idInvoice"
        striped-rows
        removable-sort
        paginator
        lazy
        :sort-mode="'single'"
        :sort-field="invoiceStore.sortField"
        :sort-order="invoiceStore.sortOrder"
        :rows="invoiceStore.rowsPerPage"
        :total-records="invoiceStore.totalInvoices"
        :rows-per-page-options="[5, 10, 20, 50]"
        table-style="min-width: 50rem"
        filter-display="menu"
        :global-filter-fields="['customer.name', 'number', 'sellDate']"
        @page="handlePageChange"
        @sort="handleSort"
        @filter="handleFilter"
        @row-contextmenu="onInvoiceRowContextMenu"
        paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
        current-page-report-template="Od {first} do {last} (Wszystkich faktur: {totalRecords})"
        size="small"
    >
      <template #empty>
        <h4 class="text-red-500" v-if="!invoiceStore.loadingInvoices">
          Nie znaleziono faktur...
        </h4>
      </template>

      <template #loading>
        <h4>Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column selectionMode="multiple" :exportable="false" style="width: 3rem" />
      <Column expander style="width: 5rem"/>
      <!--      INVOICE NUMBER  -->
      <Column field="invoiceNumber" header="Nr faktury" :sortable="true" sort-field="number">
        <template #body="{ data }">
          <span class="inline-flex items-center gap-1.5">
            {{ data.invoiceNumber }}
            <i
              v-if="data.ksefNumber?.trim()"
              class="pi pi-verified shrink-0 ml-2 text-green-600 dark:text-green-400 text-sm"
              :title="'KSeF: ' + data.ksefNumber"
              aria-hidden="true"
            />
          </span>
        </template>
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
      <Column 
        field="amount" 
        header="Wartość" 
        style="min-width: 120px" 
        dataType="numeric"
        filter-field="amount"
        :show-filter-match-modes="true"
        :show-filter-operator="true"
      >
        <template #body="{data}">
          {{ UtilsService.formatCurrency(FinanceService.getInvoiceAmount(data)) }}
        </template>
        <template #filter="{ filterModel }">
          <InputNumber v-model="filterModel.value" mode="currency" currency="PLN" locale="pl-PL"/>
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
          <Tag rounded
              :value="data[field] === 'PAID' ? 'Zapłacona' : 'Do zapłaty'"
              :severity="data[field] === 'PAID' ? 'success' : 'danger'"
              :icon="data[field] === 'PAID' ? 'pi pi-check-circle' : 'pi pi-times-circle'"
              class="cursor-pointer hover:opacity-80 transition-opacity"
              @click="confirmStatusChange(data)"
              :title="'Zmień status faktury (Zapłacona/Do zapłaty)'"
          />
        </template>
        <template #filter="{ filterModel }">
          <Select
            v-model="filterModel.value"
            :options="[
              { label: 'Zapłacona', value: 'PAID' },
              { label: 'Do zapłaty', value: 'TO_PAY' }
            ]"
            option-label="label"
            option-value="value"
            placeholder="Wybierz..."
            class="p-column-filter"
          />
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

:deep(.p-panel-header) {
    padding: 0;
  }
</style>
