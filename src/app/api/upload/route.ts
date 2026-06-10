import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { processPdfPipeline } from '@/lib/pipeline';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({ data: { name: 'Demo User', email: 'demo@example.com' } });
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileUrl: 'local',
        status: 'PROCESSING'
      }
    });

    try {
      const invoices = await processPdfPipeline(buffer);
      for (const inv of invoices) {
        await prisma.invoice.create({
          data: {
            documentId: document.id,
            voucherDate: inv.voucherDate,
            voucherNumber: inv.voucherNumber,
            buyerName: inv.buyerName,
            buyerState: inv.buyerState,
            buyerGSTIN: inv.buyerGSTIN,
            items: {
              create: inv.items.map(item => ({
                itemName: item.itemName,
                qty: item.qty,
                rate: item.rate,
                taxable: item.taxable,
                igstAmount: item.igstAmount,
                cgstAmount: item.cgstAmount,
                sgstAmount: item.sgstAmount,
                totalInvoiceAmount: item.totalInvoiceAmount,
                roundOffAmount: item.roundOffAmount
              }))
            }
          }
        });
      }

      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'COMPLETED' }
      });
    } catch (e) {
      console.error("Pipeline error:", e);
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED' }
      });
    }

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
