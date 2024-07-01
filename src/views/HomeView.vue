<script setup lang="ts">
import TheFooter from "@/components/TheFooter.vue";
import TheMenu from "@/components/TheMenu.vue";
import { useAuthorizationStore } from "@/stores/authorization";

const authorizationStore = useAuthorizationStore();
</script>

<template>
  <TheMenu />
  <h1
    v-if="!authorizationStore.isAuthenticatedOrToken"
    class="color-green flex justify-content-center mt-8"
  >
    Musisz się najpierw zalogować... ;)
  </h1>
  <TheFooter />
</template>

<style scoped></style>
