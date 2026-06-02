/** Znaki niedozwolone w nazwie pliku (Windows / ogólne). */
const UNSAFE_FILE_NAME_CHARS = /[/\\:*?"<>|]/g;

export function sanitizeFileNameSegment(value: string): string {
  const trimmed = value.trim().replace(UNSAFE_FILE_NAME_CHARS, '_');
  return trimmed || 'dokument';
}

/** Nazwa przy zapisie PDF faktury na dysk: faktura_2026_27.pdf */
export function buildInvoicePdfDownloadFileName(invoiceNumber: string): string {
  return `faktura_${sanitizeFileNameSegment(invoiceNumber)}.pdf`;
}

/** Nazwa przy zapisie PDF UPO na dysk: upo_2026_27.pdf */
export function buildUpoPdfDownloadFileName(invoiceNumber: string): string {
  return `upo_${sanitizeFileNameSegment(invoiceNumber)}.pdf`;
}

export function downloadBlobAsFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
