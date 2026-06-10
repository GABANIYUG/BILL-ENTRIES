import { InvoiceData } from './tally-mapper';

export function calculateConfidence(data: Partial<InvoiceData>): number {
  let score = 0;
  
  if (data.voucherDate) score += 15;
  if (data.voucherNumber) score += 15;
  
  const firstItem = data.items && data.items.length > 0 ? data.items[0] : null;
  
  if (firstItem && firstItem.itemName) score += 15;
  if (firstItem && firstItem.taxable !== undefined && firstItem.taxable !== null) score += 15;
  if (firstItem && firstItem.totalInvoiceAmount !== undefined && firstItem.totalInvoiceAmount !== null) score += 15;
  
  if (data.buyerGSTIN) score += 10;
  if (firstItem && firstItem.qty !== undefined && firstItem.qty !== null) score += 5;
  if (firstItem && firstItem.rate !== undefined && firstItem.rate !== null) score += 5;
  
  if (data.buyerName) score += 3;
  if (data.buyerState) score += 2;
  
  return score;
}
