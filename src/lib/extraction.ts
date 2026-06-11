import { InvoiceData } from './tally-mapper';

function cleanAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/,/g, '')) || 0;
}

export function extractDeterministicFields(text: string): Partial<InvoiceData> {
  const extracted: Partial<InvoiceData> = {
    items: []
  };

  // 1. Invoice Number Extraction
  // Matches "Invoice No", "Inv No", "Bill No", "Tax Invoice Number", etc.
  // Note: Avoid plain "Tax Invoice" as it's often a page header, not the number label.
  const invoiceNoMatch = text.match(/(?:Invoice\s+No\.?|Inv\s*\.?\s*No\.?|Bill\s+No\.?|Invoice\s+Number|Tax\s+Invoice\s*(?:No\.?|Number|#)|Document\s+No\.?|Doc\s+No\.?)[\s:\.\-]*([A-Za-z0-9\-\/]+)/i);
  if (invoiceNoMatch) {
    const matchedVal = invoiceNoMatch[1].trim().toLowerCase();
    if (matchedVal !== 'date' && matchedVal !== 'delivery' && matchedVal !== 'state') {
      extracted.voucherNumber = invoiceNoMatch[1].trim();
    }
  }
  
  if (!extracted.voucherNumber) {
    // Fallback: look for a standalone string looking like an invoice format near the top
    const looseMatch = text.match(/\b([A-Z]{2,4}\/[0-9]{2,4}\/[0-9]{3,5})\b/i);
    const vtMatch = text.match(/\b([A-Z0-9]+\/\d{2}-\d{2})\b/i);
    
    if (vtMatch) {
      extracted.voucherNumber = vtMatch[1].trim();
    } else if (looseMatch) {
      extracted.voucherNumber = looseMatch[1].trim();
    }
  }

  // 2. Date Extraction
  const dateMatch = text.match(/(?:Date|Invoice\s+Date|Bill\s+Date|Doc\s+Date)[\s:\.\-]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i);
  if (dateMatch && !dateMatch[1].toLowerCase().includes('date')) {
    extracted.voucherDate = dateMatch[1].trim();
  } else {
    // Loose fallback for Date if label is disconnected from value
    const looseDateMatch = text.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
    if (looseDateMatch) extracted.voucherDate = looseDateMatch[1].trim();
  }

  // 3. GSTIN Extraction (Seller vs Buyer)
  // We extract all GSTINs, removing word boundaries so glued text works (e.g. 24AAU...State)
  const gstinRegex = /([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1})/gi;
  const allGstins = Array.from(text.matchAll(gstinRegex)).map(m => m[1]);
  
  // Try to specifically target Buyer GSTIN
  const buyerBlockMatch = text.match(/(?:Buyer|Bill\s+To|Party|Customer|Consignee|M\/s\.?)[\s\S]{0,350}?(?:GSTIN|GST)[\s:]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
  if (buyerBlockMatch) {
    extracted.buyerGSTIN = buyerBlockMatch[1];
  } else if (allGstins.length > 1) {
    extracted.buyerGSTIN = allGstins[1]; // Usually 2nd GSTIN is the buyer
  } else if (allGstins.length === 1) {
    extracted.buyerGSTIN = allGstins[0];
  }

  // Buyer Name Extraction
  const buyerNameMatch = text.match(/(?:M\/s\.?|Buyer|Bill\s+To|Party|Customer|Delivery\s+Party)[\s:]*([A-Za-z0-9\s\&\.\-\(\)]+)/i);
  if (buyerNameMatch) {
    // Only take the first line of the name if it matched too much
    extracted.buyerName = buyerNameMatch[1].split(/[\r\n]/)[0].trim();
  }

  // 4. State Extraction
  const stateMatch = text.match(/(?:State\s*Code|State|Place of Supply|POS)[\s:]*(?:[0-9]{2}[\-\s]*)?([A-Za-z\s]+)/i);
  if (stateMatch) {
    extracted.buyerState = stateMatch[1].split(/[\r\n]/)[0].trim();
  }

  // 5. Total Aggregations
  const totalMatch = text.match(/(?:Grand\s+Total|Total\s+Invoice\s+Value|Net\s+Amount|Total\s+Amount|Total)[\s:]*(?:Rs\.?|INR|\u20B9)?\s*([0-9,]+\.[0-9]{2})/i);
  let grandTotal = 0;
  if (totalMatch) {
    grandTotal = cleanAmount(totalMatch[1]);
  } else {
    // Fallback: look for the last currency-like number near the bottom
    const allAmounts = text.match(/[0-9,]{3,}\.[0-9]{2}/g);
    if (allAmounts && allAmounts.length > 0) {
      grandTotal = cleanAmount(allAmounts[allAmounts.length - 1]);
    }
  }

  const taxTotals = {
    igst: cleanAmount(text.match(/(?:Total\s+IGST|IGST\s+Amount|IGST)[\s:]*(?:\d+(?:\.\d+)?\s*%)?[\s:]*(?:Rs\.?)?\s*([0-9,]+\.[0-9]{2})/i)?.[1]),
    cgst: cleanAmount(text.match(/(?:Total\s+CGST|CGST\s+Amount|CGST)[\s:]*(?:\d+(?:\.\d+)?\s*%)?[\s:]*(?:Rs\.?)?\s*([0-9,]+\.[0-9]{2})/i)?.[1]),
    sgst: cleanAmount(text.match(/(?:Total\s+SGST|Total\s+UTGST|SGST\s+Amount|SGST)[\s:]*(?:\d+(?:\.\d+)?\s*%)?[\s:]*(?:Rs\.?)?\s*([0-9,]+\.[0-9]{2})/i)?.[1]),
    taxable: cleanAmount(text.match(/(?:Total\s+Taxable\s+Value|Total\s+Value|Taxable\s+Amount|Taxable|Basic\s+Amount)[\s:]*(?:Rs\.?)?\s*([0-9,]+\.[0-9]{2})/i)?.[1]),
    roundOff: cleanAmount(text.match(/(?:Round\s*off|Roundoff)[\s:]*(?:Rs\.?|\u20B9)?\s*([\-0-9,]+\.[0-9]{2})/i)?.[1])
  };

  // 6. Line Item Parsing (Heuristic Table Parser)
  // We look for a line containing "Description", "Qty", "Amount"
  const lines = text.split('\n');
  let inTable = false;
  let parsedItems = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!inTable && line.match(/(?=.*(?:Description|Item|Product))(?=.*(?:Qty|Quantity|MTRS|TAKA))(?=.*(?:Rate|Price))/i)) {
      inTable = true;
      continue;
    }

    if (inTable) {
      // Break if we hit totals
      if (line.match(/(?:Total|Amount|CGST|SGST|IGST|Net\s+payable|Basic\s+Amount)/i) && !line.match(/^[0-9]/)) {
        break;
      }

      // 1. Specific row match for Qty, Rate, Discount, Amount, Taxes
      const specificRowMatch = line.match(/^(?:\d+\s+)?([A-Za-z0-9\s\-\.\&_\/\|]+?)\s+(\d+(?:\.\d{1,3})?)\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})/);
      
      // 2. Standard row: Description HSN Qty Rate Amount
      const rowMatch = line.match(/^([A-Za-z0-9\s\-\.]+?)\s+(\d{4,8})?\s*(\d+(?:\.\d+)?)\s+([0-9,]+\.[0-9]{2})\s+([0-9,]+\.[0-9]{2})$/);
      
      // 3. Textile row: [SrNo] Description HSN TAKA MTRS Rate Amount
      const textileRowMatch = line.match(/^(?:\d+)?\s*([A-Za-z0-9\s\-\.]+?)\s+(\d{4,8})?\s+(\d+(?:\.\d+)?)\s+([0-9,]+(?:\.\d{2})?)\s+([0-9,]+\.[0-9]{2})\s+([0-9,]+\.[0-9]{2})$/);
      
      // 4. Glued text row (when pdf-parse drops spaces): DescMTRSRATEAMOUNTTAKAhsn
      const gluedRowMatch = line.match(/^([A-Za-z\s\&]+?)(\d+\.\d{2})(\d+\.\d{2})([0-9,]+\.\d{2})(\d+)(\d{4,8})$/i);
      
      let desc, qty, rate, amount;
      if (specificRowMatch) {
        desc = specificRowMatch[1].trim();
        qty = cleanAmount(specificRowMatch[2]);
        rate = cleanAmount(specificRowMatch[3]);
        // specificRowMatch[4] is Discount, [5] is Amount
        amount = cleanAmount(specificRowMatch[5]);
      } else if (gluedRowMatch) {
        desc = gluedRowMatch[1].trim();
        qty = cleanAmount(gluedRowMatch[2]);
        rate = cleanAmount(gluedRowMatch[3]);
        amount = cleanAmount(gluedRowMatch[4]);
      } else if (textileRowMatch) {
        desc = textileRowMatch[1].trim();
        // textileRowMatch[3] is TAKA, [4] is MTRS (Qty)
        qty = cleanAmount(textileRowMatch[4]);
        rate = cleanAmount(textileRowMatch[5]);
        amount = cleanAmount(textileRowMatch[6]);
      } else if (rowMatch) {
        desc = rowMatch[1].trim();
        qty = cleanAmount(rowMatch[3]);
        rate = cleanAmount(rowMatch[4]);
        amount = cleanAmount(rowMatch[5]);
      }
      
      if (desc && qty && rate && amount) {
        extracted.items?.push({
          itemName: desc,
          qty: qty,
          rate: rate,
          taxable: amount,
          igstAmount: 0, // In this heuristic, we assume line item amounts are taxable base, taxes apply to total
          cgstAmount: 0,
          sgstAmount: 0,
          totalInvoiceAmount: amount, // Approximated
          roundOffAmount: 0
        });
        parsedItems++;
      }
    }
  }

  if (parsedItems > 0 && extracted.items && extracted.items.length > 0) {
    // Distribute taxes across parsed items proportionally to their base amount
    // Note: item.taxable currently holds the base amount from parsing
    const totalTaxableBase = extracted.items.reduce((sum, item) => sum + (item.taxable || 0), 0);
    if (totalTaxableBase > 0) {
      for (const item of extracted.items) {
        const baseAmount = item.taxable || 0;
        const ratio = baseAmount / totalTaxableBase;
        
        item.igstAmount = Number(((taxTotals.igst || 0) * ratio).toFixed(2));
        item.cgstAmount = Number(((taxTotals.cgst || 0) * ratio).toFixed(2));
        item.sgstAmount = Number(((taxTotals.sgst || 0) * ratio).toFixed(2));
        
        // Custom Tally mapper requirements as requested by the user:
        // 'taxable' column should be the sum of taxes
        // 'totalInvoiceAmount' column should be the base amount
        item.taxable = item.igstAmount + item.cgstAmount + item.sgstAmount;
        item.totalInvoiceAmount = baseAmount;
      }
      // Add round off to the last item
      extracted.items[extracted.items.length - 1].roundOffAmount = taxTotals.roundOff || 0;
    }
  }

  // 7. Fallback Item Aggregation
  // Always ensure at least one line item exists, so we fetch as many records as possible
  if (parsedItems === 0) {
    const baseValue = taxTotals.taxable > 0 ? taxTotals.taxable : grandTotal;
    const igst = taxTotals.igst || 0;
    const cgst = taxTotals.cgst || 0;
    const sgst = taxTotals.sgst || 0;
    const taxSum = igst + cgst + sgst;
    
    extracted.items?.push({
      itemName: 'Consolidated / Unknown Items',
      qty: 1,
      rate: baseValue || 0,
      taxable: taxSum,
      igstAmount: igst,
      cgstAmount: cgst,
      sgstAmount: sgst,
      totalInvoiceAmount: baseValue,
      roundOffAmount: taxTotals.roundOff || 0
    });
  }

  return extracted;
}
