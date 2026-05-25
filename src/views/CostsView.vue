<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
  import { FilterMatchMode } from '@primevue/core/api';
  import TheMenu from '@/components/TheMenu.vue';
  import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
  import OfficeButton from '@/components/OfficeButton.vue';
  import ToolbarActionButton from '@/components/ToolbarActionButton.vue';
  import router from '@/router';
  import { useRoute } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import { useSupplierStore } from '@/stores/suppliers';
  import { useCostStore } from '@/stores/costs';
  import type { Supplier } from '@/types/Supplier.ts';
  import type { Cost } from '@/types/Cost.ts';
  import {PaymentStatus } from '@/types/Invoice.ts';
  import { UtilsService } from '@/service/UtilsService.ts';
  import { FinanceService } from '@/service/FinanceService.ts';
  import { TranslationService } from '@/service/TranslationService.ts';
  import type { DataTablePageEvent } from 'primevue';
  import type {DataTableRowClickEvent, DataTableRowContextMenuEvent } from 'primevue/datatable';
  import type { MenuItem } from 'primevue/menuitem';
  import ContextMenu from 'primevue/contextmenu';
  import type { AxiosError } from 'axios';
  import moment from 'moment';
  import { asyncTaskStatusTimestamp } from '@/types/AsyncTask.ts';
  import type { KsefAsyncJobStatus } from '@/types/KsefJob.ts';
  import { useDatatableSelectedRowStyle } from '@/composables/useDatatableSelectedRowStyle';

  const route = useRoute();
  const supplierStore = useSupplierStore();
  const costStore = useCostStore();
  const toast = useToast();

  const toolbarBtnNowa = 'rounded-full !px-4 !py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide';

  const filters = ref();
  const initFilters = () => {
    filters.value = {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      supplier: { value: null, matchMode: FilterMatchMode.IN },
      sellDate: { constraints: [{ value: null, matchMode: FilterMatchMode.DATE_AFTER }] },
      invoiceDate: { constraints: [{ value: null, matchMode: FilterMatchMode.DATE_AFTER }] },
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
  const { selectedRowClass: costSelectedRowClass, selectedRowStyle: costSelectedRowStyle } =
    useDatatableSelectedRowStyle(selectedCosts);
  const selectedCost = computed(() => (selectedCosts.value?.length === 1 ? selectedCosts.value[0] : null));

  /** Po GET/odświeżeniu listy w store `selectedCosts` może nadal wskazywać stare obiekty — toolbar nie widzi nowych pól (np. pdfUrl). */
  function syncSelectedCostsFromStore() {
    const ids = new Set(selectedCosts.value.map((c) => c.id));
    if (ids.size === 0) return;
    selectedCosts.value = costStore.costs.filter((c) => ids.has(c.id));
  }

  const canEdit = computed(() => {
    if (selectedCosts.value.length !== 1) return false;
    return !selectedCosts.value[0].ksefNumber?.trim();
  });

  const canDelete = computed(() => selectedCosts.value.length >= 1);

  const costsEligibleForPdf = computed(() => selectedCosts.value.filter((c) => c.ksefNumber?.trim()));

  const costsSkippedWithoutKsef = computed(() => selectedCosts.value.filter((c) => !c.ksefNumber?.trim()));

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

  // —— Podgląd PDF w aplikacji (bez nowych kart) ——
  type PdfPreviewItem = { label: string; blobUrl: string };

  const showPdfPreviewDialog = ref(false);
  const pdfPreviewTitle = ref('');
  const pdfPreviewItems = ref<PdfPreviewItem[]>([]);
  const pdfPreviewBlobUrlsToRevoke = ref<string[]>([]);
  const pdfPreviewActiveIndex = ref(0);
  const loadingPdfPreview = ref(false);

  const pdfPreviewSelectOptions = computed(() => pdfPreviewItems.value.map((item, i) => ({ label: item.label, value: i })));

  const currentPdfPreviewSrc = computed(() => pdfPreviewItems.value[pdfPreviewActiveIndex.value]?.blobUrl ?? '');

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

  const formatCostNumbersForToast = (numbers: string[], maxShow = 14) => {
    if (numbers.length <= maxShow) return numbers.join(', ');
    const head = numbers.slice(0, maxShow).join(', ');
    return `${head} (+${numbers.length - maxShow} więcej)`;
  };

  /** Wczytuje PDF-y z S3 i pokazuje je w oknie dialogowym (użytkownik zostaje w aplikacji). */
  const openPdfsInAppDialog = async (title: string, entries: { url: string; costNumber: string; docLabel: string }[]) => {
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
          const response = await costStore.getPdfFromS3(e.url);
          const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(pdfBlob);
          pdfPreviewBlobUrlsToRevoke.value.push(blobUrl);
          items.push({
            label: `${e.docLabel} · ${e.costNumber}`,
            blobUrl,
          });
        } catch {
          failedNumbers.push(e.costNumber);
        }
      }

      pdfPreviewItems.value = items;

      if (items.length === 0) {
        revokePdfPreviewUrls();
        showPdfPreviewDialog.value = false;
        toast.add({
          severity: 'error',
          summary: 'Błąd PDF',
          detail: `Nie udało się wczytać PDF dla kosztów: ${formatCostNumbersForToast(failedNumbers)}.`,
          life: 8000,
        });
        return;
      }

      if (failedNumbers.length > 0) {
        toast.add({
          severity: 'warn',
          summary: 'Część plików niedostępna',
          detail: `Brak PDF dla kosztów: ${formatCostNumbersForToast(failedNumbers)}. Pozostałe dokumenty są w podglądzie.`,
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

  const handleOpenCostPdfUrls = async () => {
    const withUrl = selectedCosts.value.filter((c) => c.pdfUrl?.trim());
    if (!withUrl.length) return;
    await openPdfsInAppDialog(
      'PDF kosztu',
      withUrl.map((c) => ({
        url: c.pdfUrl!,
        costNumber: c.number || '—',
        docLabel: 'PDF',
      })),
    );
  };

  const handleOpenKsefPdfs = async () => {
    const withUrl = selectedCosts.value.filter((c) => c.ksefUrl?.trim());
    if (!withUrl.length) return;
    await openPdfsInAppDialog(
      'KSeF PDF',
      withUrl.map((c) => ({
        url: c.ksefUrl!,
        costNumber: c.number || '—',
        docLabel: 'KSeF PDF',
      })),
    );
  };

  const costTemp = ref<Cost>();

  const showStatusChangeConfirmationDialog = ref<boolean>(false);
  const confirmStatusChange = (cost: Cost) => {
    costTemp.value = cost;
    showStatusChangeConfirmationDialog.value = true;
  };

  const changeStatusConfirmationMessage = computed(() => {
    if (costTemp.value)
      return `Czy chcesz zmienić status kosztu nr <b>${costTemp.value.number}</b> na <b>${
        costTemp.value.paymentStatus === PaymentStatus.PAID ? 'Do zapłaty' : 'Zapłacony'
      }</b>?`;
    return 'No message';
  });

  const submitChangeStatus = async () => {
    if (costTemp.value) {
      const newStatus: PaymentStatus = costTemp.value.paymentStatus === PaymentStatus.PAID ? PaymentStatus.TO_PAY : PaymentStatus.PAID;
      await costStore
        .updateCostStatusDb(costTemp.value.id, newStatus)
        .then(() => {
          toast.add({
            severity: 'success',
            summary: 'Potwierdzenie',
            detail: 'Zaaktualizowano status kosztu nr: ' + costTemp.value?.number,
            life: 3000,
          });
        })
        .catch((reason: AxiosError) => {
          toast.add({
            severity: 'error',
            summary: reason.message,
            detail: 'Błąd podczas aktualizacji statusu kosztu nr: ' + costTemp.value?.number,
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
    if (!list.length) return 'No message';
    if (list.length === 1) {
      return `Czy chcesz usunąć koszt nr <b>${list[0].number}</b>?`;
    }
    const maxShow = 8;
    const nums = list
      .slice(0, maxShow)
      .map((c) => c.number)
      .join(', ');
    const more = list.length > maxShow ? ` <span class="text-surface-500">(+${list.length - maxShow} więcej)</span>` : '';
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
        severity: 'success',
        summary: 'Potwierdzenie',
        detail: ids.length === 1 ? 'Usunięto koszt nr: ' + toDelete[0].number : `Usunięto ${ids.length} kosztów.`,
        life: 3000,
      });
      selectedCosts.value = [];
    } catch {
      toast.add({
        severity: 'error',
        summary: 'Błąd',
        detail: ids.length === 1 ? 'Nie usunięto kosztu nr: ' + toDelete[0].number : 'Nie udało się usunąć wybranych kosztów.',
        life: 4000,
      });
    } finally {
      showDeleteConfirmationDialog.value = false;
      costsToDelete.value = [];
    }
  };

  //
  //-------------------------------------------------GENERATE PDF-------------------------------------------------
  //
  const showPartialKsefGenerateDialog = ref(false);
  const showGeneratePdfConfirmationDialog = ref(false);

  const partialKsefGenerateMessage = computed(() => {
    const total = selectedCosts.value.length;
    const eligible = costsEligibleForPdf.value;
    const skipped = costsSkippedWithoutKsef.value.length;
    if (!eligible.length || !skipped) return '';
    const maxShow = 8;
    const nums = eligible
      .slice(0, maxShow)
      .map((c) => c.number)
      .join(', ');
    const more = eligible.length > maxShow ? ` <span class="text-surface-500">(+${eligible.length - maxShow} więcej)</span>` : '';
    return (
      `Zaznaczono <b>${total}</b> kosztów. PDF zostanie wygenerowany wyłącznie dla <b>${eligible.length}</b> kosztów z numerem KSeF: ` +
      `<span class="text-sm">${nums}${more}</span>. ` +
      `<b>${skipped}</b> kosztów bez numeru KSeF zostanie pominiętych. Czy kontynuować?`
    );
  });

  const generatePdfConfirmationMessage = computed(() => {
    const withPdf = costsEligibleForPdf.value.filter((c) => c.pdfUrl?.trim());
    if (!withPdf.length) return '';
    if (withPdf.length === 1) {
      return `Koszt nr <b>${withPdf[0].number}</b> ma już wygenerowany PDF. Czy wygenerować ponownie i nadpisać?`;
    }
    const maxShow = 8;
    const nums = withPdf
      .slice(0, maxShow)
      .map((c) => c.number)
      .join(', ');
    const more = withPdf.length > maxShow ? ` <span class="text-surface-500">(+${withPdf.length - maxShow} więcej)</span>` : '';
    return `Wybrane koszty z KSeF (<b>${withPdf.length}</b>) mają już PDF: <span class="text-sm">${nums}${more}</span>. Czy wygenerować ponownie?`;
  });

  const proceedGeneratePdfAfterKsefInfo = () => {
    if (costsEligibleForPdf.value.some((c) => c.pdfUrl?.trim())) {
      showGeneratePdfConfirmationDialog.value = true;
    } else {
      void runGeneratePdf();
    }
  };

  const confirmPartialKsefGenerate = () => {
    showPartialKsefGenerateDialog.value = false;
    proceedGeneratePdfAfterKsefInfo();
  };

  const confirmGeneratePdf = () => {
    if (!canGeneratePdf.value) return;
    if (costsSkippedWithoutKsef.value.length > 0) {
      showPartialKsefGenerateDialog.value = true;
      return;
    }
    proceedGeneratePdfAfterKsefInfo();
  };

  const runGeneratePdf = async () => {
    const ids = costsEligibleForPdf.value.map((c) => c.id);
    if (!ids.length || costStore.loadingFile) return;
    showGeneratePdfConfirmationDialog.value = false;
    showPartialKsefGenerateDialog.value = false;
    try {
      const { failed } = await costStore.generateCostsPdf(ids);
      syncSelectedCostsFromStore();
      if (failed.length === 0) {
        toast.add({
          severity: 'success',
          summary: 'PDF',
          detail: ids.length === 1 ? 'Wygenerowano PDF dla kosztu.' : `Wygenerowano PDF dla ${ids.length} kosztów.`,
          life: 3000,
        });
      } else if (failed.length === ids.length) {
        toast.add({
          severity: 'error',
          summary: 'Błąd PDF',
          detail: `Nie udało się wygenerować PDF dla: ${formatCostNumbersForToast(failed.map((f) => f.costNumber))}.`,
          life: 6000,
        });
      } else {
        toast.add({
          severity: 'warn',
          summary: 'Część PDF',
          detail: `Błąd dla: ${formatCostNumbersForToast(failed.map((f) => f.costNumber))}. Pozostałe wygenerowano.`,
          life: 8000,
        });
      }
    } catch {
      toast.add({
        severity: 'error',
        summary: 'Błąd PDF',
        detail: 'Nie udało się wygenerować PDF.',
        life: 4000,
      });
    }
  };

  const canGeneratePdf = computed(
    () =>
      selectedCosts.value.length >= 1 &&
      !costStore.loadingFile &&
      costsEligibleForPdf.value.length >= 1,
  );

  const editItem = (item: Cost) => {
    const costItem: Cost = JSON.parse(JSON.stringify(item));
    router.push({
      name: 'Cost',
      params: { isEdit: 'true', costId: costItem.id },
    });
  };

  // —— Dialog KSeF ——
  function firstDayOfCurrentMonth(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  }

  function lastDayOfCurrentMonth(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth() + 1, 0);
  }

  const showKsefDialog = ref(false);
  const ksefDateFrom = ref<Date>(firstDayOfCurrentMonth());
  const ksefDateTo = ref<Date>(lastDayOfCurrentMonth());
  /** Loading na pasku „Sprawdź KSeF” i przy „Wyszukaj” do czasu POST + poll. */
  const loadingKsefSearch = ref(false);

  type KsefLastCheckIndicator = 'loading' | 'failed' | 'success' | 'none' | 'unavailable';

  const ksefLastCheckIndicator = computed((): KsefLastCheckIndicator => {
    if (loadingKsefSearch.value || costStore.loadingKsefLastCheck) return 'loading';
    if (costStore.ksefLastCheckFetchError) return 'unavailable';
    if (!costStore.ksefLastCheckLoaded) return 'loading';
    if (!costStore.ksefLastCheck) return 'none';
    const status = costStore.ksefLastCheck.status as KsefAsyncJobStatus;
    if (status === 'FAILED') return 'failed';
    if (status === 'QUEUED' || status === 'RUNNING') return 'loading';
    return 'success';
  });

  const ksefLastCheckTitle = computed(() => {
    const check = costStore.ksefLastCheck;
    if (!check) return 'KSeF';
    return `KSeF — status: ${check.status}`;
  });

  const ksefLastCheckLabel = computed(() => {
    if (costStore.ksefLastCheckFetchError) return 'KSeF: status niedostępny';
    if (!costStore.ksefLastCheckLoaded) return 'KSeF: …';
    if (!costStore.ksefLastCheck) return 'KSeF: jeszcze nie sprawdzano';
    const status = costStore.ksefLastCheck.status;
    if (status === 'QUEUED' || status === 'RUNNING') return 'Sprawdzanie KSeF w toku…';
    const ts = asyncTaskStatusTimestamp(costStore.ksefLastCheck);
    const when = ts && moment(ts).isValid() ? moment(ts).format('DD.MM.YYYY, HH:mm') : null;
    if (when) return `Ostatnie sprawdzenie KSeF: ${when}`;
    return 'Ostatnie sprawdzenie KSeF';
  });

  function openKsefCheckDialog() {
    if (loadingKsefSearch.value) return;
    ksefDateFrom.value = new Date(firstDayOfCurrentMonth());
    ksefDateTo.value = new Date(lastDayOfCurrentMonth());
    showKsefDialog.value = true;
  }

  function openKsefCheckDialogFromRoute() {
    if (route.query.action !== 'ksef') return;
    openKsefCheckDialog();
    router.replace({ name: 'Costs' });
  }

  function closeKsefDialog() {
    showKsefDialog.value = false;
  }

  async function searchKsefCosts() {
    const fromM = moment(ksefDateFrom.value).startOf('day');
    const toM = moment(ksefDateTo.value).startOf('day');
    if (fromM.isAfter(toM)) {
      toast.add({
        severity: 'warn',
        summary: 'KSeF',
        detail: 'Data „od” nie może być późniejsza niż data „do”.',
        life: 4000,
      });
      return;
    }
    const fromDate = fromM.format('YYYY-MM-DD');
    const toDate = toM.format('YYYY-MM-DD');

    loadingKsefSearch.value = true;
    showKsefDialog.value = false;
    try {
      const result = await costStore.fetchKsefNewCostsPreview(fromDate, toDate);
      if (!result.ok) {
        toast.add({
          severity: 'error',
          summary: 'KSeF',
          detail: result.message,
          life: 6000,
        });
        return;
      }

      const { partial, total } = result;

      if (partial) {
        toast.add({
          severity: 'warn',
          summary: 'KSeF',
          detail:
            'Synchronizacja zakończona częściowo — sprawdź szczegóły i ewentualne komunikaty z serwera.',
          life: 6000,
        });
      }

      if (total > 0) {
        if (!partial) {
          const detail =
            total === 1
              ? 'Pobrano 1 nowy koszt z KSeF. Lista została odświeżona.'
              : `Pobrano ${total} nowych kosztów z KSeF. Lista została odświeżona.`;
          toast.add({
            severity: 'success',
            summary: 'KSeF',
            detail,
            life: 5000,
          });
        }
        await costStore.getCostsFromDb(costStore.currentPage);
      } else {
        toast.add({
          severity: 'info',
          summary: 'KSeF',
          detail: 'Brak nowych kosztów z KSeF w wybranym okresie.',
          life: 4000,
        });
      }
    } catch (e: unknown) {
      const err = e as AxiosError<{ message?: string }>;
      toast.add({
        severity: 'error',
        summary: 'Błąd',
        detail: err?.response?.data?.message ?? err?.message ?? 'Nie udało się pobrać danych z KSeF.',
        life: 5000,
      });
    } finally {
      loadingKsefSearch.value = false;
      void costStore.fetchLatestKsefCostCheck();
    }
  }

  onMounted(async () => {
    void costStore.fetchLatestKsefCostCheck();
    if (supplierStore.suppliers.length <= 1) supplierStore.getSuppliersFromDb('ALL');
    if (costStore.costs.length === 0 && !costStore.loadingCosts) {
      await costStore.filterCosts(filters.value);
    }
    await nextTick();
    openKsefCheckDialogFromRoute();
  });

  watch(
    () => route.query.action,
    (action) => {
      if (action === 'ksef') openKsefCheckDialogFromRoute();
    },
  );

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

  /** Lewy klik w treść wiersza: jedna faktura; wiele wyłącznie przez checkbox (Ctrl/Shift na wierszu nie rozszerza zaznaczenia). */
  const onInvoiceRowClick = async (event: DataTableRowClickEvent) => {
    const e = event.originalEvent as MouseEvent;
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) return;
    await nextTick();
    selectedCosts.value = [event.data as Cost];
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
      label: 'Edytuj',
      icon: 'pi pi-pencil',
      disabled: !canEdit.value,
      command: () => {
        if (selectedCost.value) editItem(selectedCost.value);
      },
    },
    {
      label: 'Usuń',
      icon: 'pi pi-trash',
      disabled: !canDelete.value,
      command: () => confirmDeleteSelectedCosts(),
    },
    {
      label: 'Generuj PDF',
      icon: 'pi pi-file-export',
      disabled: !canGeneratePdf.value,
      command: () => confirmGeneratePdf(),
    },
    { separator: true },
    {
      label: 'Sprawdź KSeF',
      icon: 'pi pi-send',
      command: () => openKsefCheckDialog(),
    },
    { separator: true },
    {
      label: 'PDF',
      icon: 'pi pi-file-pdf',
      disabled: !canPreviewPdfUrl.value,
      command: () => handleOpenCostPdfUrls(),
    },
    {
      label: 'KSeF PDF',
      icon: 'pi pi-file-pdf',
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

  <ConfirmationDialog
    v-model:visible="showPartialKsefGenerateDialog"
    :msg="partialKsefGenerateMessage"
    label="Kontynuuj"
    @save="confirmPartialKsefGenerate"
    @cancel="showPartialKsefGenerateDialog = false"
  />

  <ConfirmationDialog
    v-model:visible="showGeneratePdfConfirmationDialog"
    :msg="generatePdfConfirmationMessage"
    label="Generuj"
    @save="runGeneratePdf"
    @cancel="showGeneratePdfConfirmationDialog = false"
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
      <div v-if="loadingPdfPreview" class="flex flex-1 items-center justify-center py-24">
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

  <ContextMenu ref="costRowContextMenu" :model="costRowMenuModel" @hide="onCostContextMenuHide" />

  <Dialog
    v-model:visible="showKsefDialog"
    modal
    header="Sprawdź KSeF"
    class="w-full max-w-[min(96vw,480px)]"
    :dismissable-mask="!loadingKsefSearch"
    :closable="!loadingKsefSearch"
    :close-on-escape="!loadingKsefSearch"
  >
    <div class="flex min-h-0 flex-col gap-4">
      <div class="grid gap-3 sm:grid-cols-2 sm:items-end">
        <div class="flex flex-col gap-1">
          <label for="ksef-from" class="pl-1 pb-1 text-sm text-surface-800 dark:text-surface-400">Okres od</label>
          <DatePicker
            id="ksef-from"
            v-model="ksefDateFrom"
            date-format="yy-mm-dd"
            show-icon
            fluid
            :disabled="loadingKsefSearch"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="ksef-to" class="pl-1 pb-1 text-sm text-surface-800 dark:text-surface-400">Okres do</label>
          <DatePicker
            id="ksef-to"
            v-model="ksefDateTo"
            date-format="yy-mm-dd"
            show-icon
            fluid
            :disabled="loadingKsefSearch"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-row justify-end gap-1">
        <OfficeButton
          text="Anuluj"
          btn-type="office-regular"
          :btn-disabled="loadingKsefSearch"
          @click="closeKsefDialog"
        />
        <OfficeButton
          text="Wyszukaj"
          btn-type="office-save"
          :loading="loadingKsefSearch"
          :btn-disabled="loadingKsefSearch"
          @click="searchKsefCosts"
        />
      </div>
    </template>
  </Dialog>

  <Panel>
    <div
      class="mb-3 flex flex-col gap-3 rounded-lg border border-surface-200 bg-surface-100 px-4 py-2 shadow dark:border-surface-700 dark:bg-surface-800 lg:flex-row lg:items-center lg:gap-3"
    >
      <div class="flex shrink-0 items-center justify-start">
        <router-link :to="{ name: 'Cost', params: { isEdit: 'false', costId: 0 } }" class="no-underline">
          <Button type="button" label="Nowy" icon="pi pi-plus" size="small" outlined :class="toolbarBtnNowa" title="Dodaj nowy koszt" />
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
        <ToolbarActionButton
          label="Generuj PDF"
          icon="pi pi-file-export"
          variant="orange"
          :disabled="!canGeneratePdf"
          :loading="costStore.loadingFile"
          title="Wygeneruj PDF dla kosztów z numerem KSeF (bez KSeF zostaną pominięte; istniejący PDF wymaga potwierdzenia)"
          @click="confirmGeneratePdf"
        />
        <div class="mx-0.5 h-8 shrink-0 self-center border-l border-surface-400 dark:border-surface-500" aria-hidden="true" />
        <ToolbarActionButton
          label="Sprawdź KSeF"
          icon="pi pi-send"
          variant="green"
          title="Pobierz nowe koszty z KSeF dla zakresu dat"
          :loading="loadingKsefSearch"
          :disabled="loadingKsefSearch"
          @click="openKsefCheckDialog"
        />
        <div class="mx-0.5 h-8 shrink-0 self-center border-l border-surface-400 dark:border-surface-500" aria-hidden="true" />
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
        <div
            class="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-1 text-xs text-surface-600 dark:text-surface-400"
            :title="ksefLastCheckTitle"
            role="status"
            aria-live="polite"
        >
          <ProgressSpinner
              v-if="ksefLastCheckIndicator === 'loading'"
              class="h-4 w-4 shrink-0"
              stroke-width="6"
          />
          <span
              v-else-if="ksefLastCheckIndicator === 'failed'"
              class="h-2 w-2 shrink-0 rounded-full bg-red-500"
              aria-hidden="true"
          />
          <span
              v-else-if="ksefLastCheckIndicator === 'success'"
              class="h-2 w-2 shrink-0 rounded-full bg-green-500"
              aria-hidden="true"
          />
          <span
              v-else-if="ksefLastCheckIndicator === 'none' || ksefLastCheckIndicator === 'unavailable'"
              class="h-2 w-2 shrink-0 rounded-full bg-surface-400 dark:bg-surface-500"
              aria-hidden="true"
          />
          <span>{{ ksefLastCheckLabel }}</span>
        </div>
        <IconField icon-position="left">
          <InputIcon>
            <i class="pi pi-search" />
          </InputIcon>
          <InputText v-model="filters['global'].value" placeholder="wpisz tutaj..." class="w-48" />
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
        <ProgressSpinner v-if="costStore.loadingCosts" class="h-8 w-8" stroke-width="4" />
      </div>
    </div>

    <DataTable
      v-model:selection="selectedCosts"
      :row-class="costSelectedRowClass"
      :row-style="costSelectedRowStyle"
      v-model:context-menu-selection="contextMenuCost"
      v-model:expanded-rows="expandedRows"
      v-model:filters="filters"
      :value="costStore.costs"
      :loading="costStore.loadingCosts"
      context-menu
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
      dataKey="id"
      :meta-key-selection="true"
      :global-filter-fields="['supplier.name', 'number', 'sellDate']"
      @page="handlePageChange"
      @sort="handleSort"
      @filter="handleFilter"
      @row-contextmenu="onCostRowContextMenu"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
      current-page-report-template="Od {first} do {last} (Wszystkich kosztów: {totalRecords})"
      size="small"
      @row-click="onInvoiceRowClick"
    >
      <template #empty>
        <h4 v-if="!costStore.loadingCosts" class="text-red-500">Nie znaleziono kosztów...</h4>
      </template>

      <template #loading>
        <h4>Ładowanie danych. Proszę czekać...</h4>
      </template>

      <Column selectionMode="multiple" :exportable="false" style="width: 3rem" />
      <Column expander style="width: 5rem" />

      <Column field="number" header="Nr kosztu" :sortable="true" sort-field="number">
        <template #body="{ data }">
          <span class="inline-flex items-center gap-1.5">
            {{ data.number }}
            <i
              v-if="data.ksefNumber?.trim()"
              class="pi pi-verified shrink-0 ml-2 text-green-600 dark:text-green-400 text-sm"
              :title="'KSeF: ' + data.ksefNumber"
              aria-hidden="true"
            />
          </span>
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" type="text" placeholder="Wpisz tutaj..." />
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

      <Column field="sellDate" header="Data sprzedaży" :sortable="true" data-type="date" :show-filter-match-modes="true">
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.sellDate) }}
        </template>
        <template #filter="{ filterModel }">
          <DatePicker v-model="filterModel.value" date-format="yy-mm-dd" placeholder="yyyy-dd-mm" />
        </template>
      </Column>

      <Column field="invoiceDate" header="Data wystawienia" :sortable="true" data-type="date" :show-filter-match-modes="true">
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.invoiceDate) }}
        </template>
        <template #filter="{ filterModel }">
          <DatePicker v-model="filterModel.value" date-format="yy-mm-dd" placeholder="yyyy-dd-mm" />
        </template>
      </Column>

      <Column field="paymentMethod" header="Rodzaj płatności" :sortable="true">
        <template #body="{ data }">
          {{ TranslationService.translateEnum('PaymentMethod', data.paymentMethod) }}
        </template>
      </Column>

      <Column field="paymentDate" header="Termin płatności" :sortable="true" data-type="date" :filter="false">
        <template #body="{ data }">
          {{ UtilsService.formatDateToString(data.paymentDate) }}
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
          {{ UtilsService.formatCurrency(FinanceService.getCostTotalGross(data)) }}
        </template>
        <template #filter="{ filterModel }">
          <InputNumber v-model="filterModel.value" mode="currency" currency="PLN" locale="pl-PL" />
        </template>
      </Column>

      <Column field="paymentStatus" header="Status" style="width: 150px" filter-field="paymentStatus" :show-filter-match-modes="false">
        <template #body="{ data, field }">
          <Tag
            rounded
            :value="data[field] === 'PAID' ? 'Zapłacony' : 'Do zapłaty'"
            :severity="data[field] === 'PAID' ? 'success' : 'danger'"
            :icon="data[field] === 'PAID' ? 'pi pi-check-circle' : 'pi pi-times-circle'"
            class="cursor-pointer border border-current transition-opacity hover:opacity-80"
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
          <p class="text-center">Szczegóły kosztu nr {{ slotProps.data.number }}</p>
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
                  {{ UtilsService.formatCurrency(slotPropsItem.data.amountNet) }}
                </p>
              </template>
            </Column>
            <Column>
              <template #header>
                <div class="w-full text-center">Wartość</div>
              </template>
              <template #body="slotPropsItem">
                <p class="text-center">
                  {{ UtilsService.formatCurrency(FinanceService.getCostItemGross(slotPropsItem.data)) }}
                </p>
              </template>
            </Column>
          </DataTable>
          <p class="mt-2 text-center"><b>Info:</b> {{ slotProps.data.otherInfo }}</p>
        </div>
      </template>
    </DataTable>
  </Panel>
</template>
