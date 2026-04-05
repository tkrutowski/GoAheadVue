<script setup lang="ts">
  import { computed, useAttrs } from 'vue';

  /**
   * Spójny przycisk akcji w paskach narzędzi (okrągły, outlined, jasny/ciemny, disabled szary).
   * Użycie na innych widokach: import + props variant / label / icon; logika zostaje w rodzicu.
   */
  defineOptions({ inheritAttrs: false });

  const props = withDefaults(
    defineProps<{
      label?: string;
      icon?: string;
      /** orange | red | green — dopasowane do toolbara list (np. faktury) */
      variant?: 'orange' | 'red' | 'green';
      disabled?: boolean;
      loading?: boolean;
      title?: string;
    }>(),
    { variant: 'orange' }
  );

  const attrs = useAttrs();

  const base =
    'rounded-full !px-4 !py-1.5 text-xs sm:text-sm font-semibold tracking-wide !border ' +
    'disabled:pointer-events-none disabled:!opacity-100 ' +
    'disabled:!bg-surface-300 disabled:!text-surface-500 disabled:!border-surface-400 ' +
    'dark:disabled:!bg-surface-600 dark:disabled:!text-surface-400 dark:disabled:!border-surface-500';

  const variantClass = computed(() => {
    switch (props.variant) {
      case 'red':
        return base + ' !text-red-600 !border-red-600 hover:!bg-red-100 dark:!text-red-400 dark:!border-red-400 dark:hover:!bg-red-950/60';
      case 'green':
        return (
          base +
          ' !text-green-600 !border-green-600 hover:!bg-green-100 dark:!text-green-400 dark:!border-green-400 dark:hover:!bg-green-950/60'
        );
      default:
        return (
          base +
          ' !text-orange-600 !border-orange-600 hover:!bg-orange-100 dark:!text-orange-400 dark:!border-orange-400 dark:hover:!bg-orange-950/60'
        );
    }
  });

  const mergedClass = computed(() => [variantClass.value, attrs.class]);

  /** Bez `class` — łączymy style wariantu z ewentualną klasą z rodzica. */
  const passthroughAttrs = computed(() => {
    const { class: _c, ...rest } = attrs as Record<string, unknown>;
    return rest;
  });
</script>

<template>
  <Button
    type="button"
    size="small"
    outlined
    :label="label"
    :icon="icon"
    :disabled="disabled"
    :loading="loading"
    :title="title"
    :class="mergedClass"
    v-bind="passthroughAttrs"
  />
</template>
