<script setup lang="ts">
  import { computed } from 'vue';
  import type { StatusType } from '@/types/StatusType.ts';

  const props = defineProps({
    btnType: {
      //dodanie typu
      type: String as () => StatusType,
      required: true,
    },
  });

  /** API bywa niespójne co do wielkości liter na enumach. */
  const status = computed(() => String(props.btnType ?? '').toUpperCase());

  const isPositive = computed(
    () => status.value === 'PAID' || status.value === 'ACTIVE',
  );
</script>
<template>
  <Button text rounded size="small" class="my-button">
    <i
      class="pi"
      :class="[
        isPositive ? 'pi-check-circle !text-emerald-600' : 'pi-times-circle !text-red-600',
      ]"
    />
  </Button>
</template>
<style scoped>
  .my-button:hover {
    background-color: transparent !important;
    transform: scale(1.4);
  }
</style>
