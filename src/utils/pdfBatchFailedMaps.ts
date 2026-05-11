import type { Cost } from '@/types/Cost';
import type { Invoice } from '@/types/Invoice';
import type { PdfBatchJobStatusResponse } from '@/types/PdfBatchJob';

export function invoicePdfFailedFromJob(
  requestedIds: number[],
  job: PdfBatchJobStatusResponse,
  invoices: Invoice[]
): { idInvoice: number; invoiceNumber: string }[] {
  const numById = new Map(invoices.map((i) => [i.idInvoice, i.number]));

  const fromErrors = (): { idInvoice: number; invoiceNumber: string }[] => {
    const seen = new Set<number>();
    const out: { idInvoice: number; invoiceNumber: string }[] = [];
    for (const e of job.errors ?? []) {
      const id = e.invoiceId;
      if (typeof id !== 'number' || seen.has(id)) continue;
      seen.add(id);
      out.push({ idInvoice: id, invoiceNumber: numById.get(id) ?? String(id) });
    }
    return out;
  };

  switch (job.status) {
    case 'FAILED': {
      const rows = fromErrors();
      if (rows.length > 0) return rows;
      return requestedIds.map((id) => ({
        idInvoice: id,
        invoiceNumber: numById.get(id) ?? String(id),
      }));
    }
    case 'PARTIAL':
      return fromErrors();
    default:
      return fromErrors();
  }
}

export function costPdfFailedFromJob(
  requestedIds: number[],
  job: PdfBatchJobStatusResponse,
  costs: Cost[]
): { idCost: number; costNumber: string }[] {
  const numById = new Map(costs.map((c) => [c.idCost, c.number]));

  const fromErrors = (): { idCost: number; costNumber: string }[] => {
    const seen = new Set<number>();
    const out: { idCost: number; costNumber: string }[] = [];
    for (const e of job.errors ?? []) {
      const id = e.costId;
      if (typeof id !== 'number' || seen.has(id)) continue;
      seen.add(id);
      out.push({ idCost: id, costNumber: numById.get(id) ?? String(id) });
    }
    return out;
  };

  switch (job.status) {
    case 'FAILED': {
      const rows = fromErrors();
      if (rows.length > 0) return rows;
      return requestedIds.map((id) => ({
        idCost: id,
        costNumber: numById.get(id) ?? String(id),
      }));
    }
    case 'PARTIAL':
      return fromErrors();
    default:
      return fromErrors();
  }
}
