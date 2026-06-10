import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateTallyExcel } from '@/lib/tally-mapper';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        invoices: {
          include: { items: true }
        }
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.invoices.length === 0) {
      return NextResponse.json({ error: 'No invoices found for this document' }, { status: 404 });
    }

    // Map Prisma invoices back to InvoiceData expected by tally-mapper
    const invoiceData = document.invoices.map(inv => ({
      voucherDate: inv.voucherDate || '',
      voucherNumber: inv.voucherNumber || '',
      buyerName: inv.buyerName || '',
      buyerState: inv.buyerState || '',
      buyerGSTIN: inv.buyerGSTIN,
      items: inv.items.map(item => ({
        itemName: item.itemName || '',
        qty: item.qty,
        rate: item.rate,
        taxable: item.taxable,
        igstAmount: item.igstAmount,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        totalInvoiceAmount: item.totalInvoiceAmount,
        roundOffAmount: item.roundOffAmount
      }))
    }));

    const buffer = await generateTallyExcel(invoiceData);

    const filename = `Tally_Export_${documentId}.xlsx`;

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
