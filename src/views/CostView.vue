<script setup lang="ts">
  import { useSupplierStore } from '@/stores/suppliers';
  import { useCostStore } from '@/stores/costs';
  import { useRoute, useRouter } from 'vue-router';
  import { computed, onMounted, ref } from 'vue';
  import type { Supplier } from '@/types/Supplier';
  import { type Cost, type CostItem, Vat } from '@/types/Cost';
  import { PaymentMethod, PaymentStatus } from '@/types/Invoice';
  import moment from 'moment';
  import OfficeButton from '@/components/OfficeButton.vue';
  import { useToast } from 'primevue/usetoast';
  import TheMenu from '@/components/TheMenu.vue';
  import ConfirmationDialog from '@/components/ConfirmationDialog.vue';
  import OfficeIconButton from '@/components/OfficeIconButton.vue';
  import { UtilsService } from '@/service/UtilsService.ts';
  import { FinanceService } from '@/service/FinanceService.ts';
  import type { DataTableCellEditCompleteEvent } from 'primevue';
  import type { AxiosError } from 'axios';

  const supplierStore = useSupplierStore();
  const costStore = useCostStore();
  const route = useRoute();
  const router = useRouter();

  const toast = useToast();

  const cost = ref<Cost>({
    id: 0,
    supplier: null,
    number: '',
    sellDate: new Date(),
    invoiceDate: new Date(),
    paymentDate: null,
    paymentStatus: PaymentStatus.TO_PAY,
    paymentMethod: PaymentMethod.TRANSFER,
    otherInfo: '',
    ksefNumber: '',
    ksefUrl: '',
    pdfUrl: '',
    costItems: [],
  });

  const costItem = ref<CostItem>({
    idCostItem: 0,
    idCost: 0,
    name: '',
    unit: '',
    quantity: 0,
    amountNet: 0,
    vat: Vat.VAT_23,
    amountVat: 0,
    amountGross: 0,
  });

  const vatOptions = [
    { label: '0%', value: Vat.VAT_0 },
    { label: '5%', value: Vat.VAT_5 },
    { label: '8%', value: Vat.VAT_8 },
    { label: '23%', value: Vat.VAT_23 },
    { label: 'ZW', value: Vat.VAT_ZW },
  ];

  const btnShowBusy = ref<boolean>(false);
  const btnSaveDisabled = ref<boolean>(false);

  const totalAmount = computed(() => {
    const total = FinanceService.getCostTotalGross(cost.value);
    return UtilsService.formatCurrency(total);
  });

  const isSaveBtnDisabled = computed(() => {
    return costStore.loadingCosts || supplierStore.loadingSupplier || btnSaveDisabled.value;
  });

  function saveCost() {
    submitted.value = true;
    if (isEdit.value) {
      editCost();
    } else {
      newCost();
    }
  }

  const isEdit = ref<boolean>(false);

  async function newCost() {
    if (!isValid()) {
      showError('Uzupełnij brakujące elementy');
    } else {
      btnSaveDisabled.value = true;
      const invoiceDate = moment(cost.value.invoiceDate);
      cost.value.paymentDate = invoiceDate.toDate();
      await costStore
        .addCostDb(cost.value)
        .then(() => {
          toast.add({
            severity: 'success',
            summary: 'Potwierdzenie',
            detail: 'Zapisano koszt',
            life: 3000,
          });
          setTimeout(() => {
            router.push({ name: 'Costs' });
          }, 3000);
        })
        .catch((reason: AxiosError) => {
          toast.add({
            severity: 'error',
            summary: 'Błąd podczas zapisu kosztu.',
            detail: (reason?.response?.data as { message: string }).message,
            life: 5000,
          });
          btnSaveDisabled.value = false;
        });
    }
  }

  async function editCost() {
    if (!isValid()) {
      showError('Uzupełnij brakujące elementy');
    } else {
      btnSaveDisabled.value = true;
      await costStore
        .updateCostDb(cost.value)
        .then(() => {
          toast.add({
            severity: 'success',
            summary: 'Potwierdzenie',
            detail: 'Zaaktualizowano koszt',
            life: 3000,
          });
          setTimeout(() => {
            router.push({ name: 'Costs' });
          }, 3000);
        })
        .catch((reason: AxiosError) => {
          toast.add({
            severity: 'error',
            summary: 'Błąd podczas edycji kosztu.',
            detail: (reason?.response?.data as { message: string }).message,
            life: 5000,
          });
          btnSaveDisabled.value = false;
        });
    }
  }

  function newItem() {
    costItem.value.idCostItem = 0;
    costItem.value.idCost = cost.value.id;
    if (!costItem.value.unit) costItem.value.unit = 'szt.';
    FinanceService.updateCostItemAmounts(costItem.value);
    cost.value.costItems.push({ ...costItem.value });
  }

  const onCellEditComplete = (event: DataTableCellEditCompleteEvent) => {
    const { data, newValue, field, originalEvent } = event;

    switch (field) {
      case 'amountNet':
      case 'quantity':
        if (UtilsService.isPositiveFloat(newValue)) {
          data[field] = newValue;
          FinanceService.updateCostItemAmounts(data as CostItem);
        } else originalEvent.preventDefault();
        break;

      case 'vat':
        data[field] = newValue;
        FinanceService.updateCostItemAmounts(data as CostItem);
        break;

      default:
        if (newValue && newValue.trim().length > 0) data[field] = newValue;
        else originalEvent.preventDefault();
        break;
    }
  };

  const showDeleteConfirmationDialog = ref<boolean>(false);
  const costDeleteItemIndex = ref<number>(-1);
  const confirmDeleteItem = (item: CostItem, index: number) => {
    costItem.value = item;
    costDeleteItemIndex.value = index;
    showDeleteConfirmationDialog.value = true;
  };

  const deleteConfirmationMessage = computed(() => {
    if (costItem.value) return `Czy chcesz usunąć pozycję <b>${costItem.value.name}</b>?`;
    return 'No message';
  });

  const submitDelete = async () => {
    if (costItem.value) {
      if (costDeleteItemIndex.value !== -1) cost.value.costItems.splice(costDeleteItemIndex.value, 1);
    }
    showDeleteConfirmationDialog.value = false;
  };

  onMounted(() => {
    btnSaveDisabled.value = true;
    if (supplierStore.suppliers.length <= 1) supplierStore.getSuppliersFromDb('ALL');
    btnSaveDisabled.value = false;
  });

  onMounted(async () => {
    btnSaveDisabled.value = true;
    isEdit.value = route.params.isEdit === 'true';
    if (isEdit.value) {
      const costId = Number(route.params.costId as string);
      await costStore
        .getCostFromDb(costId)
        .then((data) => {
          if (data) {
            cost.value = data;
          }
        })
        .catch((error) => {
          console.error('Błąd podczas pobierania kosztu:', error);
        });
    }
    btnSaveDisabled.value = false;
  });

  const submitted = ref(false);

  const showError = (msg: string) => {
    toast.add({
      severity: 'error',
      summary: 'Error Message',
      detail: msg,
      life: 3000,
    });
  };

  const isValid = () => {
    return (
      cost.value.supplier !== null &&
      cost.value.costItems.length > 0 &&
      cost.value.costItems.every((item) => item.quantity > 0 && item.amountNet > 0)
    );
  };

  const showErrorSeller = () => {
    return submitted.value && cost.value.supplier === null;
  };

  const getSupplierLabel = (option: Supplier) => {
    return option.name;
  };
</script>

<template>
  <Toast />
  <TheMenu />

  <ConfirmationDialog
    v-model:visible="showDeleteConfirmationDialog"
    :msg="deleteConfirmationMessage"
    label="Usuń"
    @save="submitDelete"
    @cancel="showDeleteConfirmationDialog = false"
  />

  <div class="m-4">
    <form @submit.stop.prevent="saveCost">
      <Panel>
        <template #header>
          <OfficeIconButton
            title="Powrót do listy kosztów."
            class="text-primary-400"
            icon="pi pi-arrow-left"
            @click="() => router.push({ name: 'Costs' })"
          />
          <div class="w-full flex justify-center">
            <span class="text-3xl font-bold text-surface-500 dark:text-surface-400">
              {{ isEdit ? 'Edycja kosztu' : 'Nowy koszt' }}
            </span>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Fieldset class="w-full" legend="Dane kosztu">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col w-full">
                <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="input-seller">Wybierz sprzedawcę:</label>
                <Select
                  id="input-seller"
                  v-model="cost.supplier"
                  :invalid="showErrorSeller()"
                  :options="supplierStore.getSupplierActive"
                  :option-label="getSupplierLabel"
                  required
                  :loading="supplierStore.loadingSupplier"
                  size="large"
                />
                <small class="p-error">
                  {{ showErrorSeller() ? 'Pole jest wymagane.' : '\u00A0' }}
                </small>
              </div>
              <div class="flex flex-col w-full">
                <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="input-cost-number">Numer kosztu:</label>
                <InputText id="input-cost-number" v-model="cost.number" fluid maxlength="100" autocomplete="off" size="large" />
                <small class="p-error">&nbsp;</small>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:mt-4">
              <div class="flex flex-col w-full mt-4 sm:mt-0">
                <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="invoiceDate">Data wystawienia:</label>
                <Calendar id="invoiceDate" v-model="cost.invoiceDate" show-icon date-format="yy-mm-dd" size="large" />
              </div>
              <div class="flex flex-col w-full">
                <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="sellDate">Data sprzedaży:</label>
                <Calendar id="sellDate" v-model="cost.sellDate" show-icon date-format="yy-mm-dd" size="large" />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:mt-4">
              <div class="flex flex-col w-full mt-4 sm:mt-0">
                <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="paymentMethod">Forma płatności:</label>
                <Select
                  id="paymentMethod"
                  v-model="cost.paymentMethod"
                  :options="UtilsService.getPaymentMethodsOption()"
                  option-label="label"
                  option-value="value"
                  required
                  size="large"
                />
              </div>
              <div class="flex flex-col w-full">
                <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="ksef">Numer KSeF:</label>
                <InputText id="ksef" v-model="cost.ksefNumber" fluid maxlength="100" />
              </div>
            </div>

            <div class="flex-row flex mt-4">
              <div class="flex flex-col w-full">
                <label class="pl-1 pb-1 text-surface-800 dark:text-surface-400" for="otherInfo">Dodatkowe informacje:</label>
                <Textarea id="otherInfo" v-model="cost.otherInfo" rows="4" cols="30" fluid />
              </div>
            </div>
          </Fieldset>

          <Fieldset class="w-full" legend="Pozycje kosztu">
            <DataTable
              :value="cost.costItems"
              class="pt-2 invoice-items-table"
              size="small"
              editMode="cell"
              dataKey="idCostItem"
              @cell-edit-complete="onCellEditComplete"
            >
              <template #header>
                <div class="flex justify-end mb-3">
                  <OfficeButton title="Dodaj pozycję kosztu." text="Dodaj" btn-type="office-regular" type="button" @click="newItem" />
                </div>
              </template>

              <Column
                field="name"
                header="Nazwa"
                class="min-w-52"
                headerStyle="padding-left: 1.5rem"
                bodyStyle="padding-left: 1.5rem; cursor: pointer"
              >
                <template #editor="{ data, field }">
                  <InputText v-model="data[field]" fluid maxlength="200" />
                </template>
              </Column>

              <Column field="unit" class="min-w-16" bodyStyle="text-align: center; cursor: pointer">
                <template #header>
                  <div class="w-full text-center">Jm</div>
                </template>
                <template #editor="{ data, field }">
                  <InputText v-model="data[field]" fluid maxlength="10" />
                </template>
              </Column>

              <Column field="quantity" class="min-w-16" bodyStyle="text-align: center; cursor: pointer">
                <template #header>
                  <div class="w-full text-center">Ilość</div>
                </template>
                <template #editor="{ data, field }">
                  <InputNumber
                    v-model="data[field]"
                    :min="0"
                    mode="decimal"
                    :maxFractionDigits="2"
                    fluid
                    @focus="UtilsService.selectText"
                  />
                </template>
              </Column>

              <Column field="amountNet" class="min-w-16" bodyStyle="text-align: center; cursor: pointer">
                <template #header>
                  <div class="w-full text-center">Kwota netto</div>
                </template>
                <template #body="{ data }">
                  <div class="text-center">
                    {{ UtilsService.formatCurrency(data.amountNet) }}
                  </div>
                </template>
                <template #editor="{ data, field }">
                  <InputNumber v-model="data[field]" mode="currency" currency="PLN" locale="pl-PL" fluid @focus="UtilsService.selectText" />
                </template>
              </Column>

              <Column field="vat" class="min-w-16" bodyStyle="text-align: center; cursor: pointer">
                <template #header>
                  <div class="w-full text-center">VAT</div>
                </template>
                <template #body="{ data }">
                  <div class="text-center">
                    {{ vatOptions.find((opt) => opt.value === data.vat)?.label || '' }}
                  </div>
                </template>
                <template #editor="{ data, field }">
                  <Select
                    v-model="data[field]"
                    :options="vatOptions"
                    option-label="label"
                    option-value="value"
                    size="small"
                    class="w-full"
                  />
                </template>
              </Column>

              <Column field="vatAmount" class="min-w-16" bodyStyle="text-align: center">
                <template #header>
                  <div class="w-full text-center">Kwota VAT</div>
                </template>
                <template #body="{ data }">
                  <div class="text-center">
                    {{ UtilsService.formatCurrency(FinanceService.getCostItemVat(data)) }}
                  </div>
                </template>
              </Column>

              <Column field="grossAmount" class="min-w-16" bodyStyle="text-align: center">
                <template #header>
                  <div class="w-full text-center">Kwota brutto</div>
                </template>
                <template #body="{ data }">
                  <div class="text-center">
                    {{ UtilsService.formatCurrency(FinanceService.getCostItemGross(data)) }}
                  </div>
                </template>
              </Column>

              <template #empty>
                <span class="text-red-500">Uzupełnij dane..</span>
              </template>

              <Column :exportable="false" style="width: 6rem" bodyStyle="text-align: center">
                <template #header>
                  <div class="w-full text-center">Akcja</div>
                </template>
                <template #body="slotProps">
                  <div class="flex flex-row gap-1 justify-center">
                    <OfficeIconButton
                      title="Usuń pozycję."
                      class="text-red-500"
                      icon="pi pi-trash"
                      @click="confirmDeleteItem(slotProps.data, slotProps.index)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>

            <div class="invoice-items-summary flex justify-end mt-4 pt-4 border-t border-surface-500 dark:border-surface-400">
              <p class="font-bold text-xl">RAZEM: {{ totalAmount }}</p>
            </div>
          </Fieldset>
        </div>

        <template #footer>
          <div class="flex justify-end py-6 bg-surface-100 dark:bg-surface-800 rounded-xl">
            <OfficeButton
              text="zapisz"
              class="mr-6"
              btn-type="office-save"
              type="submit"
              :loading="btnShowBusy"
              :btn-disabled="isSaveBtnDisabled"
            />
          </div>
        </template>
      </Panel>
    </form>
  </div>
</template>

<style scoped>
  :deep(.p-panel-header) {
    padding-bottom: 0;
  }
</style>
