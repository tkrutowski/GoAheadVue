<script lang="ts" setup>
import {useAuthorizationStore} from "@/stores/authorization.ts";

const authStore = useAuthorizationStore();
</script>
<template>
  <div class="flex flex-row">

  <div class="top-logo text-ahead-light mb-3 w-full">
    <div class="flex flex-row justify-between">
    <h1 class="text-left pl-3">GO AHEAD</h1>
    <theme-switcher class="ml-3" size="large"/>

    </div>
    <h4 class="text-left pl-3">usługi językowe</h4>
    <h3 class="text-left pl-3 mt-5">Agnieszka Krutowska</h3>
  <div class="flex flex-col align-items-end pt-0">
    <p v-if="authStore.isAuthenticatedOrToken" class="flex justify-end text-2xl font-bold pr-10 mb-10">Użytkownik:
      {{ authStore.username }}</p>
  </div>
  </div>
  </div>
</template>

<style scoped>
.top-logo {
  height: 170px;
  padding-top: 18px;
  background-color: #2da687;
  color: #e4e1d8;
}
</style>
