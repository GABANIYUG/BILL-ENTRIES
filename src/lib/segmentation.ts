export function segmentPdfText(fullText: string): string[] {
  // A basic heuristic for splitting text into multiple invoices.
  // We look for common invoice start keywords.
  // Note: Splitting just by these words might split mid-document if they appear in descriptions.
  // To be safe, we only split if these appear near the start of lines or preceded by significant whitespace.
  
  const splitRegex = /\n(?=TAX INVOICE|GST INVOICE|Invoice No[:\s]|Bill No[:\s]|Tax Invoice|CASH MEMO|RETAIL INVOICE)/gi;
  
  const segments = fullText.split(splitRegex);
  
  // Clean up and combine small segments that might be incorrectly split
  const minSegmentLength = 50; // minimum character count for an invoice
  const mergedSegments: string[] = [];
  
  for (const seg of segments) {
    if (seg.trim().length < minSegmentLength && mergedSegments.length > 0) {
      mergedSegments[mergedSegments.length - 1] += '\n' + seg;
    } else {
      mergedSegments.push(seg);
    }
  }
  
  return mergedSegments.map(s => s.trim()).filter(s => s.length > 0);
}
