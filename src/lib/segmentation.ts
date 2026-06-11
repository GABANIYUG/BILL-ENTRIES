export function segmentPdfText(fullText: string): string[] {
  // Split by explicit page breaks inserted by our custom pdf-parse pagerender
  const pages = fullText.split('---PAGE_BREAK---');
  
  const mergedSegments: string[] = [];
  
  for (const page of pages) {
    const p = page.trim();
    if (p.length < 50) continue;
    
    // Check if it looks like a new invoice
    // A new invoice typically has its own Invoice Number or Buyer/Bill To section at the top
    const hasInvoiceNo = p.match(/(?:Invoice\s+No\.?|Inv\s*\.?\s*No\.?|Bill\s+No\.?|Tax\s+Invoice|Document\s+No\.?)/i);
    const hasBuyer = p.match(/(?:Buyer|Bill\s+To|Customer|Consignee)/i);
    
    // If it has invoice identifiers, or it's the very first page, treat as a new segment
    if ((hasInvoiceNo || hasBuyer) || mergedSegments.length === 0) {
      mergedSegments.push(p);
    } else {
      // It's a continuation page of the previous invoice (e.g. Page 2 of 2)
      mergedSegments[mergedSegments.length - 1] += '\n' + p;
    }
  }
  
  return mergedSegments;
}
