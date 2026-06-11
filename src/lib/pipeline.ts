import { extractTextFromPdfBuffer } from './pdf-parser';
import { segmentPdfText } from './segmentation';
import { extractDeterministicFields } from './extraction';
import { calculateConfidence } from './confidence';
import { InvoiceData } from './tally-mapper';

export async function processPdfPipeline(buffer: Buffer): Promise<{ invoices: InvoiceData[], rawText: string }> {
  // Step 1: Extract full text using both strategies
  const { textStandard, textMerged } = await extractTextFromPdfBuffer(buffer);
  
  if (textStandard.trim().length < 50) {
    console.log('PDF seems scanned or empty.');
  }
  
  // Step 2: Segmentation
  const segmentsStandard = segmentPdfText(textStandard);
  const segmentsMerged = segmentPdfText(textMerged);
  
  const finalInvoices: InvoiceData[] = [];
  
  // Use the length of the standard segments as the source of truth
  for (let i = 0; i < segmentsStandard.length; i++) {
    const textSegmentStandard = segmentsStandard[i];
    const textSegmentMerged = segmentsMerged[i] || ''; // Fallback to empty string if misalignment
    
    // Step 3: Deterministic Extraction
    const extracted = extractDeterministicFields(textSegmentStandard, textSegmentMerged);
    
    // Step 4: Confidence Score (for user awareness only)
    const score = calculateConfidence(extracted);
    console.log(`Deterministic extraction confidence score: ${score}`);
    
    // Ensure structure matches InvoiceData exactly
    finalInvoices.push({
      voucherDate: extracted.voucherDate || '',
      voucherNumber: extracted.voucherNumber || '',
      buyerName: extracted.buyerName || '',
      buyerState: extracted.buyerState || '',
      buyerGSTIN: extracted.buyerGSTIN || null,
      items: extracted.items || []
    });
  }
  
  return { invoices: finalInvoices, rawText: `--- STANDARD PARSE ---\n${textStandard}\n\n--- MERGED PARSE ---\n${textMerged}` };
}
