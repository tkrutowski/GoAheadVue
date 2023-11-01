<script setup lang="ts">
import { ref } from "vue";
import { useAuthorizationStore } from "@/stores/authorization";
import OfficeButton from "@/components/OfficeButton.vue";
import router from "@/router";

const authorizationStore = useAuthorizationStore();
const items = ref([
  {
    label: "Home",
    icon: "pi pi-fw pi-home",
    disabled: !authorizationStore.hasAccessGoAhead,
    // to: { name: "Home" },
    command: () => {
      router.push({ name: "Home" });
    },
  },
  {
    label: "Finanse",
    icon: "pi pi-fw pi-euro",
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
    disabled: !authorizationStore.hasAccessGoAhead,
    items: [
      {
        label: "Nowy",
        icon: "pi pi-fw pi-user-plus",
        // to: { name: "Home" },
      },
      {
        label: "Lista klientów",
        icon: "pi pi-fw pi-bars",
        // to: { name: "Home" },
      },
    ],
  },
]);
</script>

<template>
  <div class="card relative z-2">
    <Menubar :model="items">
      <template #start>
        <img
          alt="logo"
          src="@/assets/HomeOffice.png"
          height="30"
          class="mr-2"
        />
      </template>
      <template #end>
        <div v-if="!authorizationStore.isAuthenticated">
          <router-link :to="{ name: 'login' }" style="text-decoration: none">
            <OfficeButton
              size="sm"
              class="my-2 ml-2 my-sm-0"
              btn-type="ahead"
              text="zaloguj się"
            />
          </router-link>
        </div>
        <div v-else>
          <OfficeButton
            size="sm"
            class="my-2 ml-2 my-sm-0"
            btn-type="ahead"
            text="wyloguj"
            :onclick="authorizationStore.logout"
          />
        </div>
      </template>
    </Menubar>
  </div>
</template>
<style scoped></style>
