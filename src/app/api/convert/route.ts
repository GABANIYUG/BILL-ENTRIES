import { NextRequest, NextResponse } from 'next/server';
import { processPdfPipeline } from '@/lib/pipeline';
import { generateTallyExcel } from '@/lib/tally-mapper';

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 1. Process PDF directly in memory
    const { invoices, rawText } = await processPdfPipeline(buffer);
    
    if (file.name.toLowerCase().includes('debug_text')) {
      return new NextResponse(rawText, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="RAW_PDF_TEXT_${file.name}.txt"`,
        },
      });
    }

    // 2. Generate Tally Excel buffer in memory
    const excelBuffer = await generateTallyExcel(invoices);
    
    // 3. Return the file as a downloadable response
    return new NextResponse(new Uint8Array(excelBuffer as unknown as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Tally_Export_${file.name.replace('.pdf', '')}.xlsx"`,
      },
    });

  } catch (error: unknown) {
    console.error('Convert API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
