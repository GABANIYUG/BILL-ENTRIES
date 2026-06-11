import fs from 'fs';
import { extractTextFromPdfBuffer } from './src/lib/pdf-parser';

async function test() {
    const buffer = fs.readFileSync('SALE BILL.pdf');
    const { textStandard } = await extractTextFromPdfBuffer(buffer);
    const lines = textStandard.split('\n');
    for (const line of lines) {
        if (line.toUpperCase().includes('CGST')) {
            console.log('Found CGST line:', line);
        }
    }
}

test().catch(console.error);
