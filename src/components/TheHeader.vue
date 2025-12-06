<script lang="ts" setup>
import {useAuthorizationStore} from "@/stores/authorization.ts";
import ThemeSwitcher from './ThemeSwitcher.vue'

const authStore = useAuthorizationStore();
</script>
<template>
  <div class="relative rounded-t-xl overflow-hidden bg-gradient-to-r from-[#005539] to-[#009966]">

    <!-- Main banner content -->
    <div class="flex justify-between items-center px-4 py-2 min-h-[70px]">
      <!-- Left side - title in one line -->
      <div class="flex items-end gap-3 text-surface-300">
        <p class="text-5xl font-bold uppercase m-0 font-sans tracking-wider">GO AHEAD</p>
        <p class="text-xl m-0 font-sans">usługi językowe</p>
        <p class="text-xl m-0 font-sans">Agnieszka Krutowska</p>
      </div>

      <!-- Right side - user info and theme switcher -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2.5" v-if="authStore.isAuthenticatedOrToken">
          <span class="text-white text-base font-sans">Użytkownik: {{ authStore.username }}</span>
          <div class="w-10 h-10 rounded-full bg-[#d3d3d3] flex items-center justify-center">
            <i class="pi pi-user text-[#666666] text-2xl"></i>
          </div>
        </div>
        <ThemeSwitcher/>
      </div>
    </div>
  </div>
</template>
