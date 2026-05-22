<script setup lang="ts">
  import type { Supplier } from '@/types/Supplier';
  import {
    useSupplierForm,
    SUPPLIER_FORM_SECTION_CLASS,
    SUPPLIER_FORM_SECTION_TITLE_CLASS,
    SUPPLIER_FORM_LABEL_CLASS,
    SUPPLIER_FORM_HELPER_CLASS,
    SUPPLIER_FORM_INPUT_CLASS,
  } from '@/composables/useSupplierForm';

  const supplier = defineModel<Supplier>('supplier', { required: true });
  const submitted = defineModel<boolean>('submitted', { default: false });

  const props = withDefaults(
    defineProps<{
      idPrefix?: string;
      showRegon?: boolean;
    }>(),
    {
      idPrefix: 'supplier',
      showRegon: false,
    }
  );

  const {
    companyLookupStore,
    updateSupplierNip,
    handleSupplierNipPaste,
    lookupSupplierByNip,
    showErrorName,
    showErrorNip,
    showErrorStreet,
    showErrorZip,
    showErrorCity,
  } = useSupplierForm(supplier, submitted);

  const nipId = `${props.idPrefix}-nip-lookup`;
  const nameId = `${props.idPrefix}-name`;
  const regonId = `${props.idPrefix}-regon`;
  const streetId = `${props.idPrefix}-street`;
  const zipId = `${props.idPrefix}-zip`;
  const cityId = `${props.idPrefix}-city`;
</script>

<template>
  <div class="flex flex-col gap-5">
    <section :class="SUPPLIER_FORM_SECTION_CLASS">
      <div class="flex flex-col gap-4">
        <div>
          <div :class="SUPPLIER_FORM_SECTION_TITLE_CLASS">
            <i class="pi pi-search text-sm text-primary-500" />
            <span>Dane z rejestru (GUS)</span>
          </div>
          <p class="mt-1 text-sm text-surface-600 dark:text-surface-400">
            Wpisz NIP i wybierz Szukaj, aby automatycznie uzupełnić nazwę i adres.
          </p>
        </div>

        <div class="flex flex-col gap-1">
          <label :class="SUPPLIER_FORM_LABEL_CLASS" :for="nipId">NIP</label>
          <div class="flex min-w-0 flex-nowrap items-center gap-3">
            <InputText
              :id="nipId"
              :model-value="supplier.nip"
              :class="SUPPLIER_FORM_INPUT_CLASS"
              :invalid="showErrorNip()"
              maxlength="10"
              size="large"
              placeholder="np. 1234567890"
              @update:model-value="updateSupplierNip"
              @paste.prevent="handleSupplierNipPaste"
            />

            <Button
              type="button"
              label="Szukaj"
              icon="pi pi-search"
              :loading="companyLookupStore.loadingLookup"
              :disabled="companyLookupStore.loadingLookup"
              class="h-[3rem] shrink-0 rounded-xl px-5 font-semibold uppercase tracking-wide"
              @click="lookupSupplierByNip"
            />
          </div>
          <small :class="SUPPLIER_FORM_HELPER_CLASS">{{ showErrorNip() ? 'Pole NIP musi mieć 10 cyfr.' : '\u00A0' }}</small>
        </div>
      </div>
    </section>

    <section :class="SUPPLIER_FORM_SECTION_CLASS">
      <div class="flex flex-col gap-4">
        <div :class="SUPPLIER_FORM_SECTION_TITLE_CLASS">
          <i class="pi pi-info-circle text-sm text-primary-500" />
          <span>Informacje ogólne</span>
        </div>

        <div :class="showRegon ? 'grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]' : 'grid gap-4 md:grid-cols-1'">
          <div class="flex flex-col">
            <label :class="SUPPLIER_FORM_LABEL_CLASS" :for="nameId">Nazwa dostawcy</label>
            <InputText
              :id="nameId"
              v-model="supplier.name"
              :class="SUPPLIER_FORM_INPUT_CLASS"
              :invalid="showErrorName()"
              maxlength="100"
              size="large"
            />
            <small :class="SUPPLIER_FORM_HELPER_CLASS">{{ showErrorName() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
          </div>

          <div v-if="showRegon" class="flex flex-col">
            <label :class="SUPPLIER_FORM_LABEL_CLASS" :for="regonId">REGON</label>
            <InputText :id="regonId" v-model="supplier.regon" :class="SUPPLIER_FORM_INPUT_CLASS" maxlength="14" size="large" />
            <small class="min-h-5 pl-1 text-xs text-transparent">.</small>
          </div>
        </div>
      </div>
    </section>

    <section :class="SUPPLIER_FORM_SECTION_CLASS">
      <div class="flex flex-col gap-4">
        <div :class="SUPPLIER_FORM_SECTION_TITLE_CLASS">
          <i class="pi pi-map-marker text-sm text-primary-500" />
          <span>Adres</span>
        </div>

        <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem]">
          <div class="flex flex-col">
            <label :class="SUPPLIER_FORM_LABEL_CLASS" :for="streetId">Ulica</label>
            <InputText
              :id="streetId"
              v-model="supplier.address.street"
              :class="SUPPLIER_FORM_INPUT_CLASS"
              :invalid="showErrorStreet()"
              maxlength="100"
              size="large"
            />
            <small :class="SUPPLIER_FORM_HELPER_CLASS">{{ showErrorStreet() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
          </div>

          <div class="flex flex-col">
            <label :class="SUPPLIER_FORM_LABEL_CLASS" :for="zipId">Kod</label>
            <InputText
              :id="zipId"
              v-model="supplier.address.zip"
              :class="SUPPLIER_FORM_INPUT_CLASS"
              maxlength="6"
              :invalid="showErrorZip()"
              size="large"
            />
            <small :class="SUPPLIER_FORM_HELPER_CLASS">{{ showErrorZip() ? 'Format 61754 lub 61-754.' : '\u00A0' }}</small>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-1">
          <div class="flex flex-col">
            <label :class="SUPPLIER_FORM_LABEL_CLASS" :for="cityId">Miasto</label>
            <InputText
              :id="cityId"
              v-model="supplier.address.city"
              :class="SUPPLIER_FORM_INPUT_CLASS"
              maxlength="100"
              :invalid="showErrorCity()"
              size="large"
            />
            <small :class="SUPPLIER_FORM_HELPER_CLASS">{{ showErrorCity() ? 'Pole jest wymagane.' : '\u00A0' }}</small>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
