<script setup lang="ts">
import TheFooter from "@/components/TheFooter.vue";
import TheMenu from "@/components/TheMenu.vue";
import { useAuthorizationStore } from "@/stores/authorization";
import {computed, onMounted, ref} from "vue";
import {useInvoiceStore} from "@/stores/invoices.ts";
import {UtilsService} from "../service/UtilsService.ts";
import {useCustomerStore} from "@/stores/customers.ts";
import {CustomerType} from "@/types/Customer.ts";

const customerStore = useCustomerStore();
const invoiceStore = useInvoiceStore();
const authorizationStore = useAuthorizationStore();

const chartData = ref();
const chartOptions = ref();
const statistics = ref<Record<string, number[]>>({});
const visibleYears = ref<Record<string, boolean>>({});

// Wykres klientów
const customerChartData = ref();
const customerChartOptions = ref();
const customerStatistics = ref<Record<string, number[]>>({});
const visibleCustomers = ref<Record<string, boolean>>({});
const selectedCustomerYear = ref<number>(new Date().getFullYear());

// Dostępne lata dla wykresu klientów (będą zaktualizowane po załadowaniu statystyk)
const availableYears = computed(() => {
  const years = Object.keys(statistics.value).map(y => parseInt(y)).sort((a, b) => b - a);
  // Jeśli nie ma lat w statystykach, dodaj ostatnie 5 lat
  if (years.length === 0) {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({ label: String(currentYear - i), value: currentYear - i }));
  }
  return years.map(year => ({ label: String(year), value: year }));
});

// Kolory dla każdego roku
const yearColors: Record<string, { border: string; background: string }> = {
  '2022': { border: '#6366f1', background: '#6366f180' },
  '2023': { border: '#8b5cf6', background: '#8b5cf680' },
  '2024': { border: '#ec4899', background: '#ec489980' },
  '2025': { border: '#f59e0b', background: '#f59e0b80' },
  '2026': { border: '#10b981', background: '#10b98180' },
  '2027': { border: '#06b6d4', background: '#06b6d480' }
};

// Paleta kolorów dla klientów (można rozszerzyć)
const customerColorPalette = [
  { border: '#ef4444', background: '#ef444480' }, // red
  { border: '#f97316', background: '#f9731680' }, // orange
  { border: '#f59e0b', background: '#f59e0b80' }, // amber
  { border: '#eab308', background: '#eab30880' }, // yellow
  { border: '#84cc16', background: '#84cc1680' }, // lime
  { border: '#22c55e', background: '#22c55e80' }, // green
  { border: '#10b981', background: '#10b98180' }, // emerald
  { border: '#14b8a6', background: '#14b8a680' }, // teal
  { border: '#06b6d4', background: '#06b6d480' }, // cyan
  { border: '#0ea5e9', background: '#0ea5e980' }, // sky
  { border: '#3b82f6', background: '#3b82f680' }, // blue
  { border: '#6366f1', background: '#6366f180' }, // indigo
  { border: '#8b5cf6', background: '#8b5cf680' }, // violet
  { border: '#a855f7', background: '#a855f780' }, // purple
  { border: '#d946ef', background: '#d946ef80' }, // fuchsia
  { border: '#ec4899', background: '#ec489980' }, // pink
];

// Funkcja do pobierania koloru dla klienta na podstawie jego ID
const getCustomerColor = (customerId: string): { border: string; background: string } => {
  const index = parseInt(customerId) % customerColorPalette.length;
  return customerColorPalette[index] || { border: '#6b7280', background: '#6b728080' };
};

// Oblicz sumy dla każdego roku
const yearSums = computed(() => {
  const sums: Record<string, number> = {};
  Object.keys(statistics.value).forEach(year => {
    sums[year] = statistics.value[year].reduce((acc, val) => acc + val, 0);
  });
  return sums;
});

// Oblicz sumy dla każdego klienta
const customerSums = computed(() => {
  const sums: Record<string, number> = {};
  Object.keys(customerStatistics.value).forEach(customerId => {
    sums[customerId] = customerStatistics.value[customerId].reduce((acc, val) => acc + val, 0);
  });
  return sums;
});

// Pobierz nazwę klienta po ID
const getCustomerName = (customerId: string): string => {
  const customer = customerStore.getCustomerById(parseInt(customerId));
  if (!customer) return `Klient #${customerId}`;
  
  // Jeśli to firma (brak firstName), użyj tylko name
  if (customer.customerType === CustomerType.COMPANY || !customer.firstName) {
    return customer.name;
  }
  
  return `${customer.firstName} ${customer.name}`;
};

const toggleYear = (year: string) => {
  // Jeśli wartość jest false, ustaw na true, w przeciwnym razie ustaw na false
  visibleYears.value[year] = visibleYears.value[year] === false;
  updateChartData();
};

const toggleCustomer = (customerId: string) => {
  visibleCustomers.value[customerId] = visibleCustomers.value[customerId] === false;
  updateCustomerChartData();
};

const setChartData = () => {
  const datasets = Object.keys(statistics.value)
    .sort()
    .filter(year => visibleYears.value[year] !== false)
    .map(year => {
      const colors = yearColors[year] || { border: '#6b7280', background: '#6b728080' };
      return {
        label: year,
        data: statistics.value[year],
        borderColor: colors.border,
        backgroundColor: colors.background,
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.border,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      };
    });

  return {
    labels: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
    datasets: datasets
  };
};

const updateChartData = () => {
  chartData.value = setChartData();
};

const setCustomerChartData = () => {
  const datasets = Object.keys(customerStatistics.value)
    .sort((a, b) => {
      // Sortuj po sumie wartości (malejąco)
      const sumA = customerStatistics.value[a].reduce((acc, val) => acc + val, 0);
      const sumB = customerStatistics.value[b].reduce((acc, val) => acc + val, 0);
      return sumB - sumA;
    })
    .filter(customerId => visibleCustomers.value[customerId] !== false)
    .map(customerId => {
      const colors = getCustomerColor(customerId);
      return {
        label: getCustomerName(customerId),
        data: customerStatistics.value[customerId],
        borderColor: colors.border,
        backgroundColor: colors.background,
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.border,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      };
    });

  return {
    labels: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
    datasets: datasets
  };
};

const updateCustomerChartData = () => {
  customerChartData.value = setCustomerChartData();
};

const setCustomerChartOptions = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--p-text-color');
  const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
  const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

  // Oblicz maksymalną wartość ze wszystkich danych klientów
  const allValues = Object.values(customerStatistics.value).flat();
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
  const maxYAxis = maxValue > 0 ? Math.ceil(maxValue * 1.1 / 1000) * 1000 : 25000;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // Ukryj domyślną legendę, użyjemy własnej
      },
      tooltip: {
        backgroundColor: textColor,
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: surfaceBorder,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: textColorSecondary
        },
        grid: {
          color: surfaceBorder
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: {
          stepSize: maxYAxis > 0 ? maxYAxis / 10 : 2000,
          color: textColorSecondary,
          callback: function(value: any) {
            return UtilsService.formatCurrency(value);
          }
        },
        grid: {
          color: surfaceBorder
        },
        min: 0,
        max: maxYAxis
      }
    }
  };
}

const setChartOptions = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--p-text-color');
  const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
  const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

  // Oblicz maksymalną wartość ze wszystkich danych
  const allValues = Object.values(statistics.value).flat();
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
  const maxYAxis = maxValue > 0 ? Math.ceil(maxValue * 1.1 / 1000) * 1000 : 25000; // Zaokrąglij w górę do najbliższego 1000

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // Ukryj domyślną legendę, użyjemy własnej
      },
      tooltip: {
        backgroundColor: textColor,
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: surfaceBorder,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: textColorSecondary
        },
        grid: {
          color: surfaceBorder
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: {
          stepSize: maxYAxis > 0 ? maxYAxis / 10 : 2000,
          color: textColorSecondary,
          callback: function(value: any) {
            return UtilsService.formatCurrency(value);
          }
        },
        grid: {
          color: surfaceBorder
        },
        min: 0,
        max: maxYAxis
      }
    }
  };
}

const loadStatistics = async () => {
  try {
    const data = await invoiceStore.getStatistics();
    statistics.value = data;
    
    // Inicjalizuj wszystkie lata jako widoczne
    Object.keys(data).forEach(year => {
      visibleYears.value[year] = true;
    });
    
    chartData.value = setChartData();
    chartOptions.value = setChartOptions();
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
};

const loadCustomerStatistics = async (year?: number) => {
  try {
    const yearToLoad = year || selectedCustomerYear.value;
    const data = await invoiceStore.getStatisticsByCustomer(yearToLoad);
    customerStatistics.value = data;
    
    // Inicjalizuj wszystkich klientów jako widocznych
    Object.keys(data).forEach(customerId => {
      visibleCustomers.value[customerId] = true;
    });
    
    customerChartData.value = setCustomerChartData();
    customerChartOptions.value = setCustomerChartOptions();
  } catch (error) {
    console.error('Error loading customer statistics:', error);
  }
};

const changeCustomerYear = async (year: number) => {
  selectedCustomerYear.value = year;
  await loadCustomerStatistics(year);
};

onMounted(async () => {
  if (customerStore.customers.length <= 1) {
    await customerStore.getCustomersFromDb("ALL");
  }
  await loadStatistics();
  // Po załadowaniu statystyk, ustaw dostępny rok (jeśli jest w statystykach, użyj najnowszego)
  if (availableYears.value.length > 0) {
    const yearsValues = availableYears.value.map(y => y.value);
    if (!yearsValues.includes(selectedCustomerYear.value)) {
      selectedCustomerYear.value = availableYears.value[0].value;
    }
  }
  await loadCustomerStatistics();
});
</script>

<template>
  <TheMenu />
  <h1
    v-if="!authorizationStore.isAuthenticatedOrToken"
    class="color-office flex justify-center mt-8"
  >
    Musisz się najpierw zalogować... ;)
  </h1>

  <!-- Wykres według lat -->
  <div v-else class="m-5">
    <div class="bg-surface-0 dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <!-- Header z tytułem -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-400 text-nowrap">Statystyki według lat</h2>
        
        <div class="w-full flex justify-center gap-4">
          <div v-if="invoiceStore.loadingInvoices">
            <ProgressSpinner
                class="ml-3"
                style="width: 35px; height: 35px"
                stroke-width="5"
            />
          </div>
        </div>
      </div>

      <!-- Legenda z klikalnymi prostokątami -->
      <div v-if="!invoiceStore.loadingInvoices && Object.keys(statistics).length > 0" class="flex flex-wrap gap-3 mb-6 justify-center">
        <button
          v-for="year in Object.keys(statistics).sort()"
          :key="year"
          @click="toggleYear(year)"
          :class="[
            'px-4 py-2 rounded-lg border-2 transition-all duration-200 flex items-center gap-2',
            visibleYears[year] !== false 
              ? 'opacity-100 shadow-md hover:shadow-lg' 
              : 'opacity-40 hover:opacity-60'
          ]"
          :style="{
            borderColor: yearColors[year]?.border || '#6b7280',
            backgroundColor: visibleYears[year] !== false 
              ? yearColors[year]?.background || '#6b728080' 
              : 'transparent',
            color: yearColors[year]?.border || '#6b7280'
          }"
        >
          <div
            class="w-4 h-4 rounded"
            :style="{ backgroundColor: yearColors[year]?.border || '#6b7280' }"
          ></div>
          <span class="font-medium">{{ year }}</span>
          <span class="text-sm">({{ UtilsService.formatCurrency(yearSums[year] || 0) }})</span>
        </button>
      </div>

      <!-- Wykres -->
      <div class="mt-4">
        <Chart 
          v-if="chartData" 
          type="line" 
          :data="chartData" 
          :options="chartOptions" 
          style="height: 35vh; min-height: 350px;" 
        />
      </div>
    </div>
  </div>

  <!-- Wykres klientów -->
  <div v-if="authorizationStore.isAuthenticatedOrToken" class="m-5 mt-6">
    <div class="bg-surface-0 dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <!-- Header z tytułem i selektorem roku -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-400">Statystyki według klientów</h2>
        
        <!-- Selektor roku -->
        <div class="flex items-center gap-3">
          <label for="customerYearSelect" class="text-sm font-medium text-surface-700 dark:text-surface-300">Rok:</label>
          <Select
            id="customerYearSelect"
            v-model="selectedCustomerYear"
            :options="availableYears"
            option-label="label"
            option-value="value"
            @update:modelValue="changeCustomerYear"
            class="w-32"
            :disabled="invoiceStore.loadingInvoices"
            placeholder="Wybierz rok"
          />
          <div v-if="invoiceStore.loadingInvoices" class="ml-2">
            <ProgressSpinner
                style="width: 20px; height: 20px"
                stroke-width="4"
            />
          </div>
        </div>
      </div>
      
      <!-- Komunikat o braku danych -->
      <div class="w-full flex justify-center gap-4 mb-4" v-if="!invoiceStore.loadingInvoices && Object.keys(customerStatistics).length === 0">
        <p class="text-surface-500 dark:text-surface-400">Brak danych dla wybranego roku</p>
      </div>

      <!-- Legenda z klikalnymi prostokątami dla klientów -->
      <div v-if="!invoiceStore.loadingInvoices && Object.keys(customerStatistics).length > 0" class="flex flex-wrap gap-3 mb-6 justify-center">
        <button
          v-for="customerId in Object.keys(customerStatistics).sort((a, b) => {
            const sumA = customerSums[a] || 0;
            const sumB = customerSums[b] || 0;
            return sumB - sumA;
          })"
          :key="customerId"
          @click="toggleCustomer(customerId)"
          :class="[
            'px-4 py-2 rounded-lg border-2 transition-all duration-200 flex items-center gap-2',
            visibleCustomers[customerId] !== false 
              ? 'opacity-100 shadow-md hover:shadow-lg' 
              : 'opacity-40 hover:opacity-60'
          ]"
          :style="{
            borderColor: getCustomerColor(customerId).border,
            backgroundColor: visibleCustomers[customerId] !== false 
              ? getCustomerColor(customerId).background
              : 'transparent',
            color: getCustomerColor(customerId).border
          }"
        >
          <div
            class="w-4 h-4 rounded"
            :style="{ backgroundColor: getCustomerColor(customerId).border }"
          ></div>
          <span class="font-medium">{{ getCustomerName(customerId) }}</span>
          <span class="text-sm">({{ UtilsService.formatCurrency(customerSums[customerId] || 0) }})</span>
        </button>
      </div>

      <!-- Wykres -->
      <div class="mt-4">
        <Chart 
          v-if="customerChartData" 
          type="line" 
          :data="customerChartData" 
          :options="customerChartOptions" 
          style="height: 35vh; min-height: 350px;" 
        />
      </div>
    </div>
  </div>
  <TheFooter />
</template>
