import type { Ref } from 'vue';

type RowWithId = { id: number };

const SELECTED_ROW_CLASS = 'datatable-row-selected-emphasis';

/** Wyraźne tło zaznaczonego wiersza (działa ze striped-rows). */
export function useDatatableSelectedRowStyle<T extends RowWithId>(selectedItems: Ref<T[]>) {
  const isSelected = (row: T) => selectedItems.value.some((item) => item.id === row.id);

  const selectedRowClass = (row: T) => (isSelected(row) ? SELECTED_ROW_CLASS : undefined);

  const selectedRowStyle = (row: T): Record<string, string> | undefined => {
    if (!isSelected(row)) return undefined;
    return {
      backgroundColor: 'var(--p-datatable-row-selected-bg)',
      boxShadow: 'inset 4px 0 0 var(--p-datatable-row-selected-accent)',
    };
  };

  return { selectedRowClass, selectedRowStyle };
}
