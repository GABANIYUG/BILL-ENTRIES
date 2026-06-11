import { InvoiceData } from './tally-mapper';

function cleanAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/,/g, '')) || 0;
}

export function extractDeterministicFields(textStandard: string, textMerged: string = ''): Partial<InvoiceData> {
  const extracted: Partial<InvoiceData> = {
    items: []
  };

  const text = textStandard; // Use standard text for all globals

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

  function extractMaxTax(keyword: string): number {
    let maxAmount = 0;
    
    // Helper to search a specific text string
    const searchInText = (targetText: string) => {
      const lines = targetText.split('\n');
      for (const line of lines) {
        if (new RegExp(keyword, 'i').test(line)) {
          // Find all amounts on this line
          const amounts = Array.from(line.matchAll(/([0-9,]+\.[0-9]{2})/g)).map(m => cleanAmount(m[1]));
          if (amounts.length > 0) {
            // usually the last amount is the total tax
            const amt = amounts[amounts.length - 1];
            if (amt > maxAmount) maxAmount = amt;
          }
        }
      }
    };

    searchInText(textStandard);
    if (textMerged) {
      searchInText(textMerged);
    }
    
    return maxAmount;
  }



  function attemptLineItemParsing(targetText: string): number {
    const targetLines = targetText.split('\n');
    let parsedCount = 0;

    for (let i = 0; i < targetLines.length; i++) {
      const line = targetLines[i].trim();

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
        amount = cleanAmount(specificRowMatch[5]);
      } else if (gluedRowMatch) {
        desc = gluedRowMatch[1].trim();
        qty = cleanAmount(gluedRowMatch[2]);
        rate = cleanAmount(gluedRowMatch[3]);
        amount = cleanAmount(gluedRowMatch[4]);
      } else if (textileRowMatch) {
        desc = textileRowMatch[1].trim();
        qty = cleanAmount(textileRowMatch[4]);
        rate = cleanAmount(textileRowMatch[5]);
        amount = cleanAmount(textileRowMatch[6]);
      } else if (rowMatch) {
        desc = rowMatch[1].trim();
        qty = cleanAmount(rowMatch[3]);
        rate = cleanAmount(rowMatch[4]);
        amount = cleanAmount(rowMatch[5]);
      }
      
      if (desc && desc.match(/^(?:Total|Amount|CGST|SGST|IGST|Net|Basic|Taxable|Subtotal)/i)) {
        continue;
      }
      
      if (desc && qty && rate && amount) {
        extracted.items?.push({
          itemName: desc,
          qty: qty,
          rate: rate,
          taxable: amount,
          igstAmount: 0, 
          cgstAmount: 0,
          sgstAmount: 0,
          totalInvoiceAmount: amount,
          roundOffAmount: 0
        });
        parsedCount++;
      }
    }
    return parsedCount;
  }

  // Try standard parsing first
  let parsedItems = attemptLineItemParsing(textStandard);
  
  // If standard failed, try merged parsing
  if (parsedItems === 0 && textMerged) {
    parsedItems = attemptLineItemParsing(textMerged);
  }

  // 7. Global Regex Fallback for Line Items
  if (parsedItems === 0 && textMerged) {
    const globalMatches = Array.from(textMerged.matchAll(/(?:^|\n)\s*(?:\d{1,3}\s+)?([A-Za-z0-9][\s\S]{4,150}?)\s+(\d+(?:\.\d{1,3})?)(?:\s+(?:Mtrs?|Pcs|Kgs?|Nos?|Units?|Mtr|Pieces|Meters|Rolls?))?\s+([0-9,]{1,8}\.\d{2})\s+(?:([0-9,]{1,8}\.\d{2})(?:\s*\(\d+%\))?\s+)?([0-9,]{1,12}\.\d{2})(?:\s+([0-9,]{1,12}\.\d{2})(?:\s*\(\d+%\))?)?/gi));
    
    for (const match of globalMatches) {
      let desc = match[1].replace(/\n/g, ' ').replace(/Item\s+Qty\s+Rate.*?Total\s*/i, '').trim();
      if (desc.match(/^(?:Total|Amount|CGST|SGST|IGST|Net|Basic|Taxable|Subtotal)/i)) continue;
      
      const qty = cleanAmount(match[2]);
      const rate = cleanAmount(match[3]);
      const amount = cleanAmount(match[5]);
      
      if (qty && rate && amount) {
        extracted.items?.push({
          itemName: desc,
          qty: qty,
          rate: rate,
          taxable: amount,
          igstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          totalInvoiceAmount: amount,
          roundOffAmount: 0
        });
        parsedItems++;
      }
    }
  }

  // 6. Extract Tax Totals globally as a fallback / verifier
  const taxTotals = {
    igst: extractMaxTax('IGST'),
    cgst: extractMaxTax('CGST'),
    sgst: extractMaxTax('SGST'),
    taxable: cleanAmount(text.match(/(?:Taxable\s+Amount|Taxable|Basic\s+Amount|Total\s+Basic)[^\d\n]*([0-9,]+\.[0-9]{2})/i)?.[1]),
    roundOff: extractMaxTax('Round\\s*off')
  };
  
  // Also extract negative round off
  const negRoundOffMatch = text.match(/Round\s*off[^\d\n\-]{0,25}(-?[0-9,]+\.[0-9]{2})/i);
  if (negRoundOffMatch && negRoundOffMatch[1].includes('-')) {
    taxTotals.roundOff = cleanAmount(negRoundOffMatch[1]);
  }
  
  let grandTotal = cleanAmount(text.match(/(?:Grand\s+Total|Total\s+Invoice\s+Value|Net\s+payable|Net\s+Amount)[^\d\n]*([0-9,]+\.[0-9]{2})/i)?.[1]);
  
  // If regex fails, mathematically calculate grand total
  if (!grandTotal && parsedItems > 0) {
    const totalTaxable = extracted.items!.reduce((sum, i) => sum + (i.taxable || 0), 0);
    grandTotal = Number((totalTaxable + (taxTotals.igst||0) + (taxTotals.cgst||0) + (taxTotals.sgst||0) + (taxTotals.roundOff||0)).toFixed(2));
  }

  // Apply exact invoice-level totals to each line item based on user request
  if (parsedItems > 0 && extracted.items && extracted.items.length > 0) {
    for (const item of extracted.items) {
      item.igstAmount = taxTotals.igst || 0;
      item.cgstAmount = taxTotals.cgst || 0;
      item.sgstAmount = taxTotals.sgst || 0;
      item.totalInvoiceAmount = grandTotal || 0;
    }
    extracted.items[extracted.items.length - 1].roundOffAmount = taxTotals.roundOff || 0;
  } else { }

  // 8. Final Dummy Item Fallback
  if (parsedItems === 0) {
    const baseValue = taxTotals.taxable > 0 ? taxTotals.taxable : grandTotal;
    const igst = taxTotals.igst || 0;
    const cgst = taxTotals.cgst || 0;
    const sgst = taxTotals.sgst || 0;
    const taxSum = Number((igst + cgst + sgst).toFixed(2));
    
    extracted.items?.push({
      itemName: 'Consolidated / Unknown Items',
      qty: 1,
      rate: baseValue || 0,
      taxable: taxSum,
      igstAmount: igst,
      cgstAmount: cgst,
      sgstAmount: sgst,
      totalInvoiceAmount: grandTotal || baseValue,
      roundOffAmount: taxTotals.roundOff || 0
    });
  }

  return extracted;
}
