import ExcelJS from 'exceljs';

export interface InvoiceItemData {
  itemName: string;
  qty: number | null;
  rate: number | null;
  taxable: number | null;
  igstAmount: number | null;
  cgstAmount: number | null;
  sgstAmount: number | null;
  totalInvoiceAmount: number | null;
  roundOffAmount: number | null;
}

export interface InvoiceData {
  voucherDate: string;
  voucherNumber: string;
  buyerName: string;
  buyerState: string;
  buyerGSTIN: string | null;
  items: InvoiceItemData[];
}

export async function generateTallyExcel(invoices: InvoiceData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Universal GST Converter';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Tally Import');
  
  sheet.columns = [
    { header: 'Voucher Date', key: 'voucherDate', width: 15 },
    { header: 'Voucher Type Name', key: 'voucherTypeName', width: 20 },
    { header: 'Voucher Number', key: 'voucherNumber', width: 20 },
    { header: 'Buyer Name', key: 'buyerName', width: 30 },
    { header: 'Buyer State', key: 'buyerState', width: 20 },
    { header: 'Buyer Country', key: 'buyerCountry', width: 15 },
    { header: 'Place of supply', key: 'placeOfSupply', width: 20 },
    { header: 'Buyer GSTIN', key: 'buyerGSTIN', width: 20 },
    { header: 'Gst registration type', key: 'gstRegistrationType', width: 20 },
    { header: 'Buyer Amount Dr/Cr', key: 'buyerAmountDrCr', width: 15 },
    { header: 'Sale ledger', key: 'saleLedger', width: 15 },
    { header: 'Item Name', key: 'itemName', width: 30 },
    { header: 'Qty', key: 'qty', width: 10 },
    { header: 'Rate', key: 'rate', width: 15 },
    { header: 'taxable', key: 'taxable', width: 15 },
    { header: 'Igst Name', key: 'igstName', width: 15 },
    { header: 'Cgst Name', key: 'cgstName', width: 15 },
    { header: 'Sgst Name', key: 'sgstName', width: 15 },
    { header: 'Igst Amount', key: 'igstAmount', width: 15 },
    { header: 'Cgst Amount', key: 'cgstAmount', width: 15 },
    { header: 'Sgst Amount', key: 'sgstAmount', width: 15 },
    { header: 'Total Invoice Amount', key: 'totalInvoiceAmount', width: 20 },
    { header: 'Round Off Name', key: 'roundOffName', width: 15 },
    { header: 'Round Off Amount', key: 'roundOffAmount', width: 15 },
    { header: 'Round Off Dr/Cr', key: 'roundOffDrCr', width: 15 },
    { header: 'Sale Ledger Amount Dr/Cr', key: 'saleLedgerAmountDrCr', width: 25 },
    { header: 'Change Mode', key: 'changeMode', width: 20 },
  ];
  
  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  sheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];
  
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const hasIgst = (item.igstAmount || 0) > 0;
      const hasCgst = (item.cgstAmount || 0) > 0;
      const hasSgst = (item.sgstAmount || 0) > 0;
      const hasRoundOff = item.roundOffAmount !== null && item.roundOffAmount !== undefined && item.roundOffAmount !== 0;
      
      sheet.addRow({
        voucherDate: invoice.voucherDate || '',
        voucherTypeName: 'Sales',
        voucherNumber: invoice.voucherNumber || '',
        buyerName: invoice.buyerName || '',
        buyerState: invoice.buyerState || '',
        buyerCountry: 'India',
        placeOfSupply: invoice.buyerState || '',
        buyerGSTIN: invoice.buyerGSTIN || '',
        gstRegistrationType: invoice.buyerGSTIN ? 'Regular' : 'Unregistered/Consumer',
        buyerAmountDrCr: 'Dr',
        saleLedger: 'SALE',
        itemName: item.itemName || '',
        qty: item.qty || '',
        rate: item.rate || '',
        taxable: item.taxable || '',
        igstName: hasIgst ? 'IGST' : '',
        cgstName: hasCgst ? 'CGST' : '',
        sgstName: hasSgst ? 'SGST' : '',
        igstAmount: item.igstAmount || '',
        cgstAmount: item.cgstAmount || '',
        sgstAmount: item.sgstAmount || '',
        totalInvoiceAmount: item.totalInvoiceAmount || '',
        roundOffName: hasRoundOff ? 'Round Off' : '',
        roundOffAmount: hasRoundOff ? item.roundOffAmount : '',
        roundOffDrCr: hasRoundOff ? 'Dr' : '',
        saleLedgerAmountDrCr: 'Cr',
        changeMode: 'Item Invoice',
      });
    }
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
