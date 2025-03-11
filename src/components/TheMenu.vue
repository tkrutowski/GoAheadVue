<script setup lang="ts">
import {computed, ref} from "vue";
import { useAuthorizationStore } from "@/stores/authorization";
import router from "@/router";
import {useRoute} from 'vue-router';

const route = useRoute();
const authorizationStore = useAuthorizationStore()
const activeMenu = computed(() => {
  // console.log('activeMenu', route.path)
  if (route.path.includes('/home')) return 'home';
  if (route.path.includes('/customer')) return 'customer';
  if (route.path.includes('/invoice')) return 'finance';
  return null; // Jeśli nie pasuje do żadnego menu
});

const items = ref([
  {
    label: "Home",
    icon: "pi pi-fw pi-home",
    class: `${activeMenu.value === 'home' ? 'active' : ''}`,
    disabled: !authorizationStore.hasAccessGoAhead,
    // to: { name: "Home" },
    command: () => {
      router.push({ name: "Home" });
    },
  },
  {
    label: "Finanse",
    icon: "pi pi-fw pi-euro",
    class: `${activeMenu.value === 'finance' ? 'active' : ''}`,
    disabled: !authorizationStore.hasAccessGoAhead,
    items: [
      {
        label: "Nowa faktura",
        icon: "pi pi-fw pi-file",
        // to: { name: "Invoice", params: { isEdit: "false", invoiceId: 0 } },
        command: () => {
          router.push({
            name: "Invoice",
            params: { isEdit: "false", invoiceId: 0 },
          });
        },
      },
      {
        label: "Lista faktur",
        icon: "pi pi-fw pi-list",
        // to: { name: "Invoices" },
        command: () => {
          router.push({ name: "Invoices" });
        },
      },
    ],
  },
  {
    label: "Klienci",
    icon: "pi pi-fw pi-users",
    class: `${activeMenu.value === 'customer' ? 'active' : ''}`,
    disabled: !authorizationStore.hasAccessGoAhead,
    items: [
      {
        label: "Nowy",
        icon: "pi pi-fw pi-user-plus",
        command: () => {
          router.push({
            name: "Customer",
            params: { isEdit: "false", customerId: 0 },
          });
        },
      },
      {
        label: "Lista klientów",
        icon: "pi pi-fw pi-bars",
        command: () => {
          router.push({ name: "Customers" });
        },
      },
    ],
  },
]);
</script>

<template>
  <div class="card relative z-2">
    <Menubar :model="items">
      <template #start>
        <img alt="logo" src="@/assets/logo_mini.png" height="30" class="mr-2" />
      </template>
      <template #end>
        <div class="flex items-center">
          <p class="px-5 mr-10 text-lg md:hidden text-primary font-bold">{{ activeMenu }}</p>
          <div v-if="!authorizationStore.isAuthenticatedOrToken">
            <router-link :to="{ name: 'login' }" style="text-decoration: none">
              <Button class="font-bold uppercase tracking-wider" size="small" outlined>zaloguj</Button>
            </router-link>
          </div>
          <div v-else>
            <Button
                class="font-bold uppercase tracking-wider"
                outlined
                size="small"
                :onclick="authorizationStore.logout"
            >wyloguj
            </Button>
          </div>
        </div>
      </template>
    </Menubar>
  </div>
</template>
<style scoped></style>
