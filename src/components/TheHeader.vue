<script lang="ts" setup>
import {useAuthorizationStore} from "@/stores/authorization.ts";
import ThemeSwitcher from './ThemeSwitcher.vue'

const authStore = useAuthorizationStore();
</script>
<template>
  <div class="grid grid-cols-2 bg-primary-500 mb-2">

      <div class="flex flex-col ml-2">
        <p class="text-left text-4xl pl-3 text-surface-300">GO AHEAD</p>
        <p class="text-left text-xl pl-3 text-surface-300">usługi językowe</p>
        <p class="text-left text-3xl pl-3 mt-3 text-surface-300">Agnieszka Krutowska</p>

      </div>
      <div class=" flex flex-col h-full content-between " style="align-items: flex-end !important;">
        <theme-switcher/>
        <p
            v-if="authStore.isAuthenticatedOrToken"
            class="grow text-surface-300 content-end font-bold pr-1 "
        >
          Użytkownik: {{ authStore.username }}
        </p>
    </div>
  </div>
</template>
