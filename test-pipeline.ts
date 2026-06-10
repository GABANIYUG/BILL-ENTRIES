import fs from 'fs';
import { processPdfPipeline } from './src/lib/pipeline';
import { generateTallyExcel } from './src/lib/tally-mapper';

async function test() {
  try {
    const buffer = fs.readFileSync('./sample.pdf');
    console.log('Testing processPdfPipeline...');
    const invoices = await processPdfPipeline(buffer);
    console.log(`Extracted ${invoices.length} invoices.`);
    console.log(JSON.stringify(invoices, null, 2));

    const excelBuffer = await generateTallyExcel(invoices);
    fs.writeFileSync('./sample-output.xlsx', excelBuffer);
    console.log('Successfully wrote sample-output.xlsx');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

test();
