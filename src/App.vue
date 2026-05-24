<script setup lang="ts">
  import { nextTick, onMounted, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import TheHeader from '@/components/TheHeader.vue';
  import ZusDraDialog from '@/components/invoice/ZusDraDialog.vue';
  import { useZusDraDialogStore } from '@/stores/zusDraDialog';
  import Toast from 'primevue/toast';

  const route = useRoute();
  const router = useRouter();
  const zusDraDialogStore = useZusDraDialogStore();

  function openZusDraDialogFromRoute() {
    if (route.query.action !== 'zus-dra') return;
    zusDraDialogStore.open();
    const query = { ...route.query };
    delete query.action;
    router.replace({ path: route.path, query });
  }

  onMounted(async () => {
    await nextTick();
    openZusDraDialogFromRoute();
  });

  watch(
    () => route.query.action,
    (action) => {
      if (action === 'zus-dra') openZusDraDialogFromRoute();
    }
  );
</script>

<template>
  <Toast class="min-w-max" />
  <TheHeader />
  <router-view />
  <ZusDraDialog />
</template>
