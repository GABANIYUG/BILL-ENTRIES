const fs = require('fs');
const { processPdfPipeline } = require('./src/lib/pipeline');

async function test() {
    const buffer = fs.readFileSync('sample.pdf');
    const { invoices } = await processPdfPipeline(buffer);
    console.log(JSON.stringify(invoices[0]?.items, null, 2));
    console.log(JSON.stringify(invoices[1]?.items, null, 2));
}

test().catch(console.error);
