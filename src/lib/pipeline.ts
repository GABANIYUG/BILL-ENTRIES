import { extractTextFromPdfBuffer } from './pdf-parser';
import { segmentPdfText } from './segmentation';
import { extractDeterministicFields } from './extraction';
import { calculateConfidence } from './confidence';
import { InvoiceData } from './tally-mapper';

export async function processPdfPipeline(buffer: Buffer): Promise<{ invoices: InvoiceData[], rawText: string }> {
  // Step 1: Extract full text
  const fullText = await extractTextFromPdfBuffer(buffer);
  
  if (fullText.trim().length < 50) {
    console.log('PDF seems scanned or empty.');
  }
  
  // Step 2: Segmentation
  const segmentedTexts = segmentPdfText(fullText);
  const finalInvoices: InvoiceData[] = [];
  
  for (const textSegment of segmentedTexts) {
    // Step 3: Deterministic Extraction
    const extracted = extractDeterministicFields(textSegment);
    
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
  
  return { invoices: finalInvoices, rawText: fullText };
}
