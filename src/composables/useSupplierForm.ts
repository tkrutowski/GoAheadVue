import { type Ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useCompanyLookupStore } from '@/stores/companyLookup';
import { ActiveStatus } from '@/types/Customer';
import type { Supplier } from '@/types/Supplier';
import { UtilsService } from '@/service/UtilsService.ts';
import type { AxiosError } from 'axios';

export const SUPPLIER_FORM_SECTION_CLASS =
  'rounded-2xl border border-surface-200 bg-white/80 p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900/40 sm:p-5';
export const SUPPLIER_FORM_SECTION_TITLE_CLASS =
  'flex items-center gap-2 text-lg font-semibold text-surface-900 dark:text-surface-50';
export const SUPPLIER_FORM_LABEL_CLASS = 'pb-1 pl-1 text-sm font-medium text-surface-700 dark:text-surface-300';
export const SUPPLIER_FORM_HELPER_CLASS = 'min-h-5 pl-1 text-xs text-red-500';
export const SUPPLIER_FORM_INPUT_CLASS = 'w-full';

export function createEmptySupplier(): Supplier {
  return {
    id: 0,
    name: '',
    nip: '',
    regon: '',
    phone: '',
    mail: '',
    otherInfo: '',
    status: ActiveStatus.ACTIVE,
    accountNumber: '',
    bankName: '',
    address: {
      id: 0,
      city: '',
      street: '',
      zip: '',
    },
  };
}

export function useSupplierForm(supplier: Ref<Supplier>, submitted: Ref<boolean>) {
  const toast = useToast();
  const companyLookupStore = useCompanyLookupStore();

  function showFormError(msg: string) {
    toast.add({
      severity: 'error',
      summary: 'Error Message',
      detail: msg,
      life: 5000,
    });
  }

  function updateSupplierNip(value: string | number | undefined | null) {
    supplier.value.nip = UtilsService.normalizeNipDigits(String(value ?? ''));
  }

  function handleSupplierNipPaste(event: ClipboardEvent) {
    event.preventDefault();
    updateSupplierNip(event.clipboardData?.getData('text') ?? '');
  }

  async function lookupSupplierByNip() {
    const digits = UtilsService.normalizeNipDigits(supplier.value.nip);
    if (digits.length !== 10) {
      showFormError('Podaj NIP jako 10 cyfr.');
      return;
    }

    try {
      const result = await companyLookupStore.lookupByNip(digits);
      const addr = result.addressDto;

      supplier.value.nip = UtilsService.normalizeNipDigits(result.nip);
      supplier.value.name = result.name;
      if (result.regon) {
        supplier.value.regon = result.regon;
      }
      supplier.value.address.street = addr.street;
      supplier.value.address.zip = addr.zip;
      supplier.value.address.city = addr.city;
      const bankName = result.bankName;
      if (bankName != null && bankName !== '') {
        supplier.value.bankName = bankName;
      }
      if (result.accountNumber != null && result.accountNumber !== '') {
        supplier.value.accountNumber = result.accountNumber;
      }

      toast.add({
        severity: 'success',
        summary: 'Potwierdzenie',
        detail: 'Uzupełniono dane dostawcy na podstawie NIP.',
        life: 3000,
      });
    } catch (reason) {
      const err = reason as AxiosError;
      toast.add({
        severity: 'error',
        summary: 'Wyszukiwanie po NIP',
        detail: (err?.response?.data as { message?: string })?.message ?? 'Nie udało się pobrać danych.',
        life: 5000,
      });
    }
  }

  const isValid = () => {
    return (
      supplier.value.name.length > 0 &&
      /^\d{10}$/.test(supplier.value.nip) &&
      supplier.value.address.street.length > 0 &&
      supplier.value.address.zip.length > 0 &&
      supplier.value.address.city.length > 0
    );
  };

  const showErrorName = () => submitted.value && supplier.value.name.length <= 0;
  const showErrorNip = () => submitted.value && !/^\d{10}$/.test(supplier.value.nip);
  const showErrorStreet = () => submitted.value && supplier.value.address.street.length <= 0;

  const showErrorZip = () => {
    if (submitted.value) {
      const { zip } = supplier.value.address;
      return !(/(^\d{2}-\d{3}$)/.test(zip) && zip.length <= 6) && !(/(^\d{5})/.test(zip) && zip.length <= 5);
    }

    return false;
  };

  const showErrorCity = () => submitted.value && supplier.value.address.city.length <= 0;

  const showErrorMail = () => {
    if (submitted.value && supplier.value.mail.length > 0) {
      return !supplier.value.mail.includes('@');
    }

    return false;
  };

  const showErrorPhone = () => {
    if (submitted.value && supplier.value.phone.length > 0) {
      return !/^[0-9]+$/.test(supplier.value.phone);
    }

    return false;
  };

  return {
    companyLookupStore,
    updateSupplierNip,
    handleSupplierNipPaste,
    lookupSupplierByNip,
    isValid,
    showFormError,
    showErrorName,
    showErrorNip,
    showErrorStreet,
    showErrorZip,
    showErrorCity,
    showErrorMail,
    showErrorPhone,
  };
}
