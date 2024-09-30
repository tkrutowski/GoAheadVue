<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const redirect = route.query.redirect ? JSON.parse(route.query.redirect as string) : { name: 'Home' };
router.replace(redirect);
</script>

<template>
  <div></div>
</template>

<style scoped>

</style>