<script setup lang="ts">
import {computed, ref, onMounted, onUnmounted} from "vue";
import {useAuthorizationStore} from "@/stores/authorization";
import router from "@/router";
import {useRoute} from 'vue-router';

const route = useRoute();
const authorizationStore = useAuthorizationStore();
const openSubmenu = ref<string | null>(null);

const activeMenu = computed(() => {
  if (route.path.includes('/home')) return 'home';
  if (route.path.includes('/customer')) return 'customer';
  if (route.path.includes('/invoice')) return 'finance';
  return null;
});

interface SubmenuItem {
  label: string;
  icon: string;
  routeName: string;
  params?: Record<string, string | number>;
}

interface MenuItem {
  label: string;
  icon: string;
  routeName?: string;
  key: string;
  submenu?: SubmenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: "Home",
    icon: "pi pi-home",
    routeName: "Home",
    key: 'home'
  },
  {
    label: "Finanse",
    icon: "pi pi-wallet",
    routeName: "Invoices",
    key: 'finance',
    submenu: [
      {
        label: "Nowa faktura",
        icon: "pi pi-file",
        routeName: "Invoice",
        params: {isEdit: "false", invoiceId: 0}
      },
      {
        label: "Lista faktur",
        icon: "pi pi-list",
        routeName: "Invoices"
      },
    ]
  },
  {
    label: "Klienci",
    icon: "pi pi-users",
    routeName: "Customers",
    key: 'customer',
    submenu: [
      {
        label: "Nowy",
        icon: "pi pi-user-plus",
        routeName: "Customer",
        params: {isEdit: "false", customerId: 0}
      },
      {
        label: "Lista klientów",
        icon: "pi pi-bars",
        routeName: "Customers"
      },
    ]
  },
];

const toggleSubmenu = (key: string) => {
  if (openSubmenu.value === key) {
    openSubmenu.value = null;
  } else {
    openSubmenu.value = key;
  }
};

const navigateTo = (routeName: string, params?: Record<string, string | number>) => {
  if (params) {
    router.push({name: routeName, params});
  } else {
    router.push({name: routeName});
  }
  openSubmenu.value = null;
};

const handleLogout = () => {
  authorizationStore.logout();
  router.push({ name: 'login' });
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.menu-item-container')) {
    openSubmenu.value = null;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <nav class="bg-[#2f363c] relative min-h-[50px]">
    <div class="flex items-center justify-between px-4 min-h-[50px]">
      <!-- Spacer po lewej stronie -->
      <div class="flex-1"></div>

      <!-- Elementy menu - wyśrodkowane -->
      <div class="flex items-center justify-center gap-0">
        <div
            v-for="item in menuItems"
            :key="item.key"
            class="menu-item-container relative"
        >
          <!-- Przycisk menu -->
          <button
              :class="[
              'flex items-center gap-2 px-5 py-3 bg-transparent border-none text-[#bbbbbb] cursor-pointer text-base transition-all duration-200 min-h-[50px] relative',
              { 'bg-[#2a3036] text-primary-100': activeMenu === item.key },
              { 'opacity-50 cursor-not-allowed': !authorizationStore.hasAccessGoAhead }
            ]"
              :disabled="!authorizationStore.hasAccessGoAhead"
              @click="item.submenu ? toggleSubmenu(item.key) : (item.routeName ? navigateTo(item.routeName) : null)"
              @mouseenter="item.submenu && authorizationStore.hasAccessGoAhead ? openSubmenu = item.key : null"
          >
            <i :class="['text-lg', item.icon, { 'text-primary-100': activeMenu === item.key }]"></i>
            <span class="font-medium">{{ item.label }}</span>
            <i
                v-if="item.submenu"
                class="pi pi-angle-down text-sm ml-1 transition-transform duration-200"
                :class="{ 'rotate-180': openSubmenu === item.key }"
            ></i>
            <div
                v-if="activeMenu === item.key"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-100"
            ></div>
          </button>

          <!-- Submenu dropdown -->
          <div
              v-if="item.submenu && openSubmenu === item.key"
              class="absolute top-full left-0 bg-[#2f363c] border border-[#3f464c] rounded-b shadow-lg min-w-[200px] z-50 mt-0.5"
              @mouseleave="openSubmenu = null"
          >
            <button
                v-for="subItem in item.submenu"
                :key="subItem.routeName"
                class="w-full flex items-center gap-2 px-4 py-2.5 text-[#bbbbbb] hover:bg-[#3a4147] hover:text-white transition-colors text-sm text-left"
                @click="navigateTo(subItem.routeName, subItem.params)"
            >
              <i :class="['text-sm', subItem.icon]"></i>
              <span>{{ subItem.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Przycisk WYLOGUJ - po prawej stronie -->
      <div class="flex-1 flex items-center justify-end">
        <button
            v-if="authorizationStore.isAuthenticatedOrToken"
            class="rounded-full px-5 py-1.5 bg-[#3a4147] border border-primary-100 text-[#bbbbbb] font-bold uppercase tracking-[0.15em] text-base transition-all duration-200 hover:bg-[#4a5157] hover:border-primary-600 hover:text-white"
            @click="handleLogout"
        >
          WYLOGUJ
        </button>
        <router-link
            v-else
            :to="{ name: 'login' }"
            class="no-underline rounded-full px-5 py-1.5 bg-[#3a4147] border border-primary-600 text-[#bbbbbb] font-bold uppercase tracking-[0.15em] text-sm transition-all duration-200 hover:bg-[#4a5157] hover:border-[#6a7177] hover:text-white inline-block"
        >
          ZALOGUJ
        </router-link>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.menu-item-container button:not(:disabled):hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: #dddddd;
}
</style>
