import fs from 'fs';
import { extractTextFromPdfBuffer } from './src/lib/pdf-parser';
import { segmentPdfText } from './src/lib/segmentation';

async function test() {
  const buffer = fs.readFileSync('./sample.pdf');
  const fullText = await extractTextFromPdfBuffer(buffer);
  const segments = segmentPdfText(fullText);
  console.log('--- FIRST INVOICE TEXT ---');
  console.log(segments[0]);
  console.log('--------------------------');
}
test();
