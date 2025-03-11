<script setup lang="ts">
import {useAuthorizationStore} from "@/stores/authorization.ts";
import {onMounted, ref} from "vue";
import router from "@/router";

const authorizationStore = useAuthorizationStore();
const counter = ref<number>(5);

const startPingLoop = () => {
  const interval = setInterval(() => {
    if (counter.value > 0) {
      counter.value--;
    } else {
      authorizationStore.testPing()
          .then(() => {
            clearInterval(interval);
            router.back();
          })
          .catch(() => {
            counter.value = 5;
          });
    }
  }, 1000);
};

onMounted(() => {
  console.log("onMounted() Error503");
  startPingLoop();
});
</script>

<template>
  <div class="mt-5 pt-5 text-center">
    <h2>Serwis chwilowo niedostępny</h2>
    <h3>Proszę spróbować za {{counter}} sekund</h3>
  </div>
</template>

<style scoped></style>
