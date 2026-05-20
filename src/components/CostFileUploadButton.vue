<script setup lang="ts">
  import { ref } from 'vue';
  import OfficeButton from '@/components/OfficeButton.vue';

  const props = withDefaults(
    defineProps<{
      loading?: boolean;
      disabled?: boolean;
    }>(),
    {
      loading: false,
      disabled: false,
    }
  );

  const emit = defineEmits<{
    select: [file: File];
  }>();

  const fileInputRef = ref<HTMLInputElement | null>(null);

  const openFilePicker = () => {
    if (props.loading || props.disabled) return;
    fileInputRef.value?.click();
  };

  const onFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    emit('select', file);
  };
</script>

<template>
  <input
    ref="fileInputRef"
    type="file"
    accept=".pdf,image/*"
    class="hidden"
    tabindex="-1"
    aria-hidden="true"
    @change="onFileChange"
  />
  <OfficeButton
    text="Z pliku"
    btn-type="office-regular"
    type="button"
    title="Uzupełnij koszt z pliku PDF lub obrazu"
    :loading="loading"
    :btn-disabled="loading || disabled"
    @click="openFilePicker"
  />
</template>
