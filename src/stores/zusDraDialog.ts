import { defineStore } from 'pinia';

export const useZusDraDialogStore = defineStore('zusDraDialog', {
  state: () => ({
    visible: false,
  }),

  actions: {
    open() {
      this.visible = true;
    },

    close() {
      this.visible = false;
    },
  },
});
