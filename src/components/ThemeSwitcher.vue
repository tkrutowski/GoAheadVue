<template>
  <div class="card flex justify-end p-2">
    <Button
        class="inline-flex w-8 h-8 p-0 items-center justify-center surface-500 border border-surface-300 rounded"
        @click="onThemeToggle"
        outlined
        :icon="`text-white pi ${iconClass}`"
    >
    </Button>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'

const iconClass = ref<string>('pi-sun')

const onThemeToggle = () => {
  const root = document.getElementsByTagName('html')[0]
  // root.classList.toggle('dark')
  iconClass.value = iconClass.value === 'pi-moon' ? 'pi-sun' : 'pi-moon'
  if (iconClass.value !== 'pi-moon') {
    root.classList.remove('dark')
    root.classList.add('light')
    localStorage.setItem('theme', 'light')
  } else {
    root.classList.remove('light')
    root.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  }
}

onMounted(() => {
  const theme = localStorage.getItem('theme')
  const root = document.getElementsByTagName('html')[0]
  if (theme === 'dark') {
    root.classList.add('dark')
    // document.documentElement.classList.classList.add('dark');
    iconClass.value = 'pi-moon'
  } else {
    // document.documentElement.classList.classList.add('light');
    root.classList.add('light')
    iconClass.value = 'pi-sun'
  }
})
</script>
