<script setup lang="ts">
import TheFooter from "@/components/TheFooter.vue";
import TheMenu from "@/components/TheMenu.vue";
import { useAuthorizationStore } from "@/stores/authorization";
import {computed, onMounted, ref} from "vue";
import {useInvoiceStore} from "@/stores/invoices.ts";
import {FinanceService} from "@/service/FinanceService.ts";
import type {Invoice} from "@/types/Invoice.ts";

const invoiceStore = useInvoiceStore();
const authorizationStore = useAuthorizationStore();

const chartData = ref();
const chartOptions = ref();

const data2023 = computed(() => {
  // Tablica do przechowywania sumy kwot za każdy miesiąc (indeks 0 = styczeń, 11 = grudzień)
  const monthlyTotals = new Array(12).fill(0);
  invoiceStore.invoices
      .filter(invoice => invoice.invoiceDate && invoice.invoiceDate.getFullYear() === 2023) // Filtrujemy faktury z roku 2023
      .forEach(invoice => {
        const month = invoice.invoiceDate?.getMonth(); // Pobieramy numer miesiąca (0 - styczeń, 11 - grudzień)
        month ? monthlyTotals[month] += FinanceService.getInvoiceAmount(invoice) : 0; // Dodajemy kwotę do odpowiedniego miesiąca
      });

  return monthlyTotals; // Zwracamy sumy za każdy miesiąc
})

const data2024 = computed(() => {
  // Tablica do przechowywania sumy kwot za każdy miesiąc (indeks 0 = styczeń, 11 = grudzień)
  const monthlyTotals = new Array(12).fill(0);
  invoiceStore.invoices
      .filter(invoice => invoice.invoiceDate && invoice.invoiceDate.getFullYear() === 2024) // Filtrujemy faktury z roku 2023
      .forEach(invoice => {
        const month = invoice.invoiceDate?.getMonth(); // Pobieramy numer miesiąca (0 - styczeń, 11 - grudzień)
        month ? monthlyTotals[month] += FinanceService.getInvoiceAmount(invoice) : 0; // Dodajemy kwotę do odpowiedniego miesiąca
      });

  return monthlyTotals; // Zwracamy sumy za każdy miesiąc
})

const data2025 = computed(() => {
  // Tablica do przechowywania sumy kwot za każdy miesiąc (indeks 0 = styczeń, 11 = grudzień)
  const monthlyTotals = new Array(12).fill(0);
  invoiceStore.invoices
      .filter(invoice => invoice.invoiceDate && invoice.invoiceDate.getFullYear() === 2025) // Filtrujemy faktury z roku 2023
      .forEach((invoice: Invoice) => {
        const month = invoice.invoiceDate?.getMonth(); // Pobieramy numer miesiąca (0 - styczeń, 11 - grudzień)
        month ? monthlyTotals[month] += FinanceService.getInvoiceAmount(invoice) : 0; // Dodajemy kwotę do odpowiedniego miesiąca
      });

  return monthlyTotals; // Zwracamy sumy za każdy miesiąc
})

const setChartData = () => {
  const documentStyle = getComputedStyle(document.documentElement);

  return {
    labels: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', "Grudzień"],
    datasets: [
      {
        label: '2023',
        // fill: false,
        backgroundColor: documentStyle.getPropertyValue('--p-gray-500'),
        borderColor: documentStyle.getPropertyValue('--p-gray-500'),
        // yAxisID: 'y',
        // tension: 0.4,
        data: data2023
      },
      {
        label: '2024',
        // fill: false,
        backgroundColor: documentStyle.getPropertyValue('--office-color-300'),
        borderColor: documentStyle.getPropertyValue('--office-color-300'),
        // yAxisID: 'y1',
        // tension: 0.4,
        data: data2024
      },
      {
        label: '2025',
        // fill: false,
        backgroundColor: documentStyle.getPropertyValue('--office-color-300'),
        borderColor: documentStyle.getPropertyValue('--office-color-300'),
        // yAxisID: 'y1',
        // tension: 0.4,
        data: data2025
      }
    ]
  }
};

const setChartOptions = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--p-text-color');
  const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
  const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

  return {
    stacked: false,
    maintainAspectRatio: false,
    aspectRatio: null,
    plugins: {
      legend: {
        labels: {
          color: textColor
        }
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
          stepSize: 2000,  // Ustawienie podziałki co 2000
          color: textColorSecondary
        },
        grid: {
          color: surfaceBorder
        },
        min: 0,    // Ustaw minimalną wartość
        max: 25000 // Ustaw maksymalną wartość, dopasowaną do Twoich danych
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        ticks: {
          stepSize: 2000,  // Ustawienie podziałki co 2000
          color: textColorSecondary
        },
        grid: {
          drawOnChartArea: false,
          color: surfaceBorder
        },
        min: 0,    // Ustaw minimalną wartość
        max: 25000 // Ustaw maksymalną wartość, dopasowaną do Twoich danych
      }
    }
  };
}

onMounted(() => {
  // await customerStore.getCustomersFromDb("ALL", false);
  invoiceStore.getInvoicesFromDb("ALL");
  chartData.value = setChartData();
  chartOptions.value = setChartOptions();
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

  <div v-else class="card" style="margin: 20px">
<!--    <Chart type="line" :data="chartData" :options="chartOptions" style="height: 50vh;" />-->
    <Chart type="bar" :data="chartData" :options="chartOptions" style="height: 50vh;" />
  </div>

  <TheFooter />
</template>

<style scoped></style>
